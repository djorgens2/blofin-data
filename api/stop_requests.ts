//+--------------------------------------------------------------------------------------+
//|                                                              [api]  stop_requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, TResponse } from "db/query.utils";
import type { IStopsAPI } from "api/stops";
import type { IStopRequest } from "db/interfaces/stop_request";

import { API_POST, ApiError } from "api/api.util";
import { PrimaryKey } from "db/query.utils";
import { hexify } from "lib/crypto.util";

import * as Request from "db/interfaces/stop_request";
import * as Orders from "db/interfaces/stops";

type TResponseAPI = {
  orderId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

type TRequestResponse = Partial<IStopRequest> & TResponse;

interface IPublishConfig {
  context: string;
  states: { success: string; fail: string };
  outcomes: { success: string; fail: string };
  messages: { success: string; fail: string };
}

/**
 * Process the api response returned after a POST call
 */
const publish = async (response: Array<TResponseAPI>, config: IPublishConfig): Promise<Array<IPublishResult<IStopRequest>>> => {
  if (!Array.isArray(response) || !response.length) {
    console.error(`-> [Error] ${config.context}: Invalid response format`, response);
    return [];
  }

  const orders = await Promise.all(
    response.map(async (request) => {
      const exists = await Orders.Fetch({ stop_request: hexify(request.clientOrderId! || parseInt(request.orderId!), 5) });

      if (!exists) {
        throw new ApiError(457, `Stop Order not found for Request: ${request.clientOrderId || request.orderId}`);
      }

      const success = (request.code || "0") === "0";
      const [current] = exists;

      return {
        success,
        current,
        request: {
          stop_request: current.stop_request,
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
        key: PrimaryKey(request, ["stop_request"]),
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
export const Cancel = async (requests: Array<Partial<IStopsAPI>>) => {
  if (!requests.length) return [];
  console.log(`-> Cancel [API]`);

  const result = await API_POST<Array<TResponseAPI>>("/api/v1/trade/cancel-tpsl", requests, "Stop.Request.Cancel");

  return await publish(result, {
    context: "Stop.Request.Publish.Cancel",
    states: { success: "Closed", fail: "Canceled" },
    outcomes: { success: "closed", fail: "error" },
    messages: {
      success: "[Info] Stop Order canceled successfully",
      fail: "[Error] Stop Order cancellation failed",
    },
  });
};

/**
 * Submits new requests through the API
 */
export const Submit = async (request: Partial<IStopsAPI>) => {
  if (!request) return [];
  console.log(`-> Submit [API]`);

  const result = await API_POST<TResponseAPI>("/api/v1/trade/order-tpsl", request, "Stop.Request.Submit");

  return await publish([result], {
    context: "Stop.Request.Publish.Submit",
    states: { success: "Pending", fail: "Rejected" },
    outcomes: { success: "pending", fail: "rejected" },
    messages: {
      success: "[Info] Stop Order submitted successfully",
      fail: "[Error] Stop Order submission failed",
    },
  });
};
