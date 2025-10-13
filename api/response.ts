//+---------------------------------------------------------------------------------------+
//|                                                                    [api]  response.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest, IRequestState } from "db/interfaces/state";

//import { DB_SCHEMA, Modify, parseColumns, Select } from "db/query.utils";
import { hexify } from "lib/crypto.util";

import * as Requests from "db/interfaces/request";
import * as States from "db/interfaces/state";

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
    for (const response of responses) {
      const request = hexify(response.clientOrderId, 6) || hexify(parseInt(response.orderId), 6);
      const memo =
        response.code === "0"
          ? `[Info] Response.Request: Successful response received from broker API`
          : `[Warn] Response.Request: Update failed with code [${response.code}]: ${response.msg}`;
      const result = await Requests.Submit({
        request,
        state: success,
        update_time: new Date(),
        memo,
      });

      if (result && response.code === "0") {
        request
          ? accept.push({
              code: parseInt(response.code),
              request,
              state: success,
              memo,
            })
          : reject.push({ code: parseInt(response.code), request, state: fail, memo });
      } else {
        console.warn(`-> [Error] Response.Request: Error response received from broker API`, response);
        reject.push({ code: parseInt(response.code), request: request!, state: fail!, memo });
      }
    }
    return [accept, reject];
  } else {
    console.warn("-> [Error] Response.Request: No response data received from broker API");
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
