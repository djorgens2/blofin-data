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
  code: string;
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
  const results: Array<{ code: number; request: Uint8Array; state: Uint8Array; memo: string }> = [];

  if (Array.isArray(responses) && responses.length) {
    for (const response of responses) {
      const request = hexify(response.clientOrderId, 6) || hexify(parseInt(response.orderId), 6);

      if (response.code && !!parseInt(response.code)) {
        // if error
        console.warn(`-> [Error] Response.Request: Error response received from broker API`, response);
        const result = await Requests.Submit({ request, state: fail, memo: `[Error] ${response.msg} (code: ${response.code}` });
        results.push({ code: parseInt(response.code), request: request!, state: fail!, memo: `[Error] ${response.msg} (code: ${response.code}` });
      } else {
        const result = await Requests.Submit({ request, state: success, memo: `[Info] Response.Request: Successful response received from broker API` });
        result
          ? results.push({
              code: parseInt(response.code),
              request: request!,
              state: success!,
              memo: `[Info] Response.Request: Successful response received from broker API`,
            })
          : results.push({ code: parseInt(response.code), request: request!, state: fail!, memo: `[Error] ${response.msg} (code: ${response.code}` });
      }
    }
  } else console.warn("-> [Error] Response.Request: No response data received from broker API");
  return results;
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
