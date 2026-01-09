//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, TOutcome, TResponse } from "db/query.utils";
import type { TRequestState, IRequestState } from "db/interfaces/state";
import type { IRequest } from "db/interfaces/request";

import { hexify } from "lib/crypto.util";
import { PrimaryKey, Update } from "db/query.utils";
import { API_POST } from "api/api.util";

import * as States from "db/interfaces/state";

export interface IRequestAPI {
  account: Uint8Array;
  status?: States.TRequestState;
  orderId?: string;
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  side: "buy" | "sell";
  orderType: string;
  price: string;
  size: string;
  leverage: string;
  reduceOnly: string;
  clientOrderId: string;
  tpTriggerPrice: undefined | null;
  tpOrderPrice: undefined | null;
  slTriggerPrice: undefined | null;
  slOrderPrice: undefined | null;
  brokerId: string | undefined;
  memo: string;
  createTime: string;
  updateTime: string;
  expiry_time?: Date;
}

type TResponseAPI = {
  orderId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

type TRequestResponse = Partial<IRequest> & TResponse;

interface PublishConfig {
  context: string;
  states: { success: TRequestState; fail: TRequestState };
  outcomes: { success: TOutcome; fail: TOutcome };
  messages: { success: string; fail: string };
}

/**
 * Process the api result returned after a POST call
 */
const processResults = async (response: TResponseAPI, config: PublishConfig): Promise<Array<IPublishResult<IRequest>>> => {
  if (!Array.isArray(response) || !response.length) {
    console.error(`-> [Error] ${config.context}: Invalid response format`, response);
    return [];
  }

  // 1. Fetch States in parallel
  const [success, fail] = await Promise.all([
    States.Key<IRequestState>({ status: config.states.success }),
    States.Key<IRequestState>({ status: config.states.fail }),
  ]);

  // 2. Map and Categorize (Reduce)
  const items = response.map((item) => {
    const apiSuccess = (item.code || "0") === "0";
    return {
      apiSuccess,
      data: {
        request: hexify(item.clientOrderId!, 6) || hexify(parseInt(item.orderId!), 6),
        order_id: hexify(parseInt(item.orderId!), 6),
        state: apiSuccess ? success : fail,
        memo: apiSuccess ? config.messages.success : `${config.messages.fail} [${item.code}]: ${item.msg}`,
        update_time: new Date(),
        code: parseInt(item.code) || 0,
        message: item.msg,
      } as TRequestResponse,
    };
  });

  // 3. Database Updates and Result Formatting
  return Promise.all(
    items.map(async ({ apiSuccess, data }) => {
      const { code, message, ...updates } = data;
      const dbResult = await Update<IRequest>(updates, {
        table: `request`,
        keys: [{ key: `request` }],
      });

      return {
        key: PrimaryKey(data, ["order_id", "request"]),
        response: {
          ...dbResult,
          context: config.context,
          outcome: apiSuccess ? config.outcomes.success : config.outcomes.fail,
          message: apiSuccess ? data.memo : dbResult.success ? message : data.memo,
          code: apiSuccess ? 0 : dbResult.success ? code || 0 : data.code || 0,
        },
      };
    })
  );
};

/**
 * Cancels open orders through the API
 */
export const Cancel = async (requests: Array<Partial<IRequestAPI>>) => {
  if (requests.length === 0) return [];

  const cancels = requests.map(({ instId, orderId }) => ({ instId, orderId }));
  const result = await API_POST<TResponseAPI>("/api/v1/trade/cancel-batch-orders", cancels, "Request.Cancel");

  return await processResults(result, {
    context: "Request.Publish.Cancel",
    states: { success: "Closed", fail: "Canceled" },
    outcomes: { success: "closed", fail: "error" },
    messages: {
      success: "[Info] Order canceled successfully",
      fail: "[Error] Order Cancellation failed",
    },
  });
};

/**
 * Submits new requests through the API
 */
export const Submit = async (requests: Array<Partial<IRequestAPI>>) => {
  if (requests.length === 0) return [];

  const result = await API_POST<TResponseAPI>("/api/v1/trade/batch-orders", requests, "Request.Submit");

  return await processResults(result, {
    context: "Request.Publish.Submit",
    states: { success: "Pending", fail: "Rejected" },
    outcomes: { success: "pending", fail: "rejected" },
    messages: {
      success: "[Info] Order submitted successfully",
      fail: "[Error] Order submission failed",
    },
  });
};
