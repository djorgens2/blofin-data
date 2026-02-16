//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, TResponse } from "api";
import type { TRequestState } from "db/interfaces/state";
import type { IRequest } from "db/interfaces/request";

import { API_POST, ApiError, PrimaryKey } from "api/api.util";
import { hexify } from "lib/crypto.util";

import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";

export interface IRequestAPI {
  account: Uint8Array;
  status?: TRequestState;
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
  states: { success: string; fail: string };
  outcomes: { success: string; fail: string };
  messages: { success: string; fail: string };
}

/**
 * Process the api response returned after a POST call
 */
const publish = async (response: TResponseAPI, config: PublishConfig): Promise<Array<IPublishResult<IRequest>>> => {
  if (!Array.isArray(response) || !response.length) {
    console.error(`-> [Error] ${config.context}: Invalid response format`, response);
    return [];
  }

  const orders = await Promise.all(
    response.map(async (request) => {
      const exists = await Orders.Fetch({ request: hexify(request.clientOrderId! || parseInt(request.orderId!), 6) });

      if (!exists) {
        throw new ApiError(454, `Order not found for Request: ${request.clientOrderId || request.orderId}`);
      }

      const success = (request.code || "0") === "0";
      const [current] = exists;

      return {
        success,
        current,
        request: {
          request: current.request,
          status: success ? config.states.success : config.states.fail,
          memo: success ? config.messages.success : `${config.messages.fail} [${request.code}]: ${request.msg}`,
          update_time: new Date(),
          code: parseInt(request.code) || 0,
          message: request.msg,
        } as TRequestResponse,
      };
    })
  );

  return Promise.all(
    orders.map(async ({ success, current, request }) => {
      const { code, message, ...updates } = request;
      const result = await Request.Publish('API', current, updates);

      return {
        key: PrimaryKey(request, ["request"]),
        response: {
          ...result.response,
          context: config.context,
          outcome: success ? config.outcomes.success : config.outcomes.fail,
          message: success ? request.memo : result.response.success ? message : request.memo,
          code: success ? 0 : result.response.success ? code || 0 : request.code || 0,
        },
      };
    })
  );
};

/**
 * Cancels open orders through the API
 */
export const Cancel = async (requests: Array<Partial<IRequestAPI>>) => {
  if (!requests.length) return [];

  const cancels = requests.map(({ instId, orderId }) => ({ instId, orderId }));
  const result = await API_POST<TResponseAPI>("/api/v1/trade/cancel-batch-orders", cancels, "Request.Cancel");

  return await publish(result, {
    context: "Request.Publish.Cancel",
    states: { success: "Closed", fail: "Canceled" },
    outcomes: { success: "closed", fail: "error" },
    messages: {
      success: "[Info] Order canceled successfully",
      fail: "[Error] Order cancellation failed",
    },
  });
};

/**
 * Submits new requests through the API
 */
export const Submit = async (requests: Array<Partial<IRequestAPI>>) => {
  if (!requests.length) return [];

  const result = await API_POST<TResponseAPI>("/api/v1/trade/batch-orders", requests, "Request.Submit");

  return await publish(result, {
    context: "Request.Publish.Submit",
    states: { success: "Pending", fail: "Rejected" },
    outcomes: { success: "pending", fail: "rejected" },
    messages: {
      success: "[Info] Order submitted successfully",
      fail: "[Error] Order submission failed",
    },
  });
};
