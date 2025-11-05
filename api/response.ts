//+---------------------------------------------------------------------------------------+
//|                                                                    [api]  response.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest, IRequestState } from "db/interfaces/state";
import type { IStops } from "db/interfaces/stops";

import { hexify } from "lib/crypto.util";
import { Update } from "db/query.utils";

import * as States from "db/interfaces/state";
import * as Orders from "db/interfaces/order";
import * as StopOrders from "db/interfaces/stops";

export type TResponse = {
  orderId: string;
  tpslId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

export interface IResponse {
  code: number;
  msg: string;
  request: Uint8Array;
  order_id: Uint8Array;
  state: Uint8Array;
  status: TRequest;
  memo: string;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Handles responses received from WSS/API or POST calls;                               |
//+--------------------------------------------------------------------------------------+
export const Request = async (responses: TResponse[], props: { success: TRequest; fail: TRequest }) => {
  const success = await States.Key<IRequestState>({ status: props.success });
  const fail = await States.Key<IRequestState>({ status: props.fail });
  const accept: Array<Partial<IResponse>> = [];
  const reject: Array<Partial<IResponse>> = [];

  if (Array.isArray(responses) && responses.length) {
    console.log(`-> [Info] Response.Request: Responses received:`, responses.length, responses);
    for (const response of responses) {
      const request = {
        request: hexify(response.clientOrderId, 6) || hexify(parseInt(response.orderId), 6),
        order_id: hexify(parseInt(response.orderId), 6),
        state: response.code === "0" ? success : fail,
        memo:
          response.code === "0"
            ? `[Info] Response.Request: Order ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Request: ${props.fail === "Rejected" ? `Order` : `Cancellation`} failed with code [${response.code}]: ${response.msg}`,
        update_time: new Date(),
      };
      const [result, updates] = await Update<Orders.IOrder>(request, { table: `request`, keys: [{ key: `request` }] });
      result ? accept.push({ ...request, code: parseInt(response.code) }) : reject.push({ ...request, code: parseInt(response.code) });
    }
    return [accept, reject];
  } else {
    console.log("-> [Error] Response.Request: No response data received from broker API");
    return [accept, reject];
  }
};

//+--------------------------------------------------------------------------------------+
//| Handles responses received from WSS/API or POST calls;                               |
//+--------------------------------------------------------------------------------------+
export const Stops = async (responses: TResponse[], props: { success: TRequest; fail: TRequest }) => {
  const success = await States.Key<IRequestState>({ status: props.success });
  const fail = await States.Key<IRequestState>({ status: props.fail });
  const queued: Array<Partial<IStops>> = [];
  const accept: Array<Partial<IResponse>> = [];
  const reject: Array<Partial<IResponse>> = [];

  if (Array.isArray(responses) && responses.length) {
    console.log(`-> [Info] Response.Stops: Responses received:`, responses.length, responses);
    for (const response of responses) {
      const stop_request = {
        tpsl_id: hexify(parseInt(response.tpslId), 4),
        state: response.code === "0" ? success : fail,
        memo:
          response.code === "0"
            ? `[Info] Response.Stops: StopOrder ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Stops: ${props.fail === "Rejected" ? `Stop` : `Cancellation`} failed with code [${response.code}]: ${response.msg}`,
        update_time: new Date(),
      };
      const [result, updates] = await Update(stop_request, { table: `vw_stop_states`, keys: [{ key: `tpsl_id` }] });

      result ? accept.push({ ...stop_request, code: parseInt(response.code) }) : reject.push({ ...stop_request, code: parseInt(response.code) });
    }
    return [accept, reject];
  } else {
    console.log("-> [Error] Response.Stops: No response data received from broker API");
    return [accept, reject];
  }
};

//+--------------------------------------------------------------------------------------+
//| Sets request states based on changes recieved from WSS/API or POST ops;              |
//+--------------------------------------------------------------------------------------+
export const Leverage = async (props: { results: TResponse[] }) => {
  const accepted = [];
  const rejected = [];
  const errors = [];

  console.log("In Response.Leverage", props);
};
