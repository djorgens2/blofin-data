//+---------------------------------------------------------------------------------------+
//|                                                                    [api]  response.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest, IRequestState } from "db/interfaces/state";

import { hexify } from "lib/crypto.util";

import * as Orders from "db/interfaces/order";
import * as States from "db/interfaces/state";
import { Update } from "db/query.utils";

export type TResponse = {
  orderId: string;
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
    console.log(`-> [Info] Response.Request: Received responses:`, responses.length, responses);
    for (const response of responses) {
      const request = {
        request: hexify(response.clientOrderId, 6) || hexify(parseInt(response.orderId), 6),
        order_id: hexify(parseInt(response.orderId), 6),
        state: response.code === "0" ? success : fail,
        memo:
          response.code === "0"
            ? `[Info] Response.Request: Order ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Request: ${props.success === "Rejected" ? `Order` : `Cancellation`} failed with code [${response.code}]: ${response.msg}`,
        update_time: new Date(),
      };
      if (response.code === "0") {
        const [result, updates] = await Update<Orders.IOrder>(request, { table: `request`, keys: [{ key: `request` }] });
        result ? accept.push({ ...request, code: parseInt(response.code) }) : reject.push({ ...request, code: parseInt(response.code) });
      } else {
        console.log(`-> [Error] Response.Request: Error response received from broker API`, response);
        reject.push({ ...request, code: parseInt(response.code) });
      }
    }
    return [accept, reject];
  } else {
    console.log("-> [Error] Response.Request: No response data received from broker API");
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
