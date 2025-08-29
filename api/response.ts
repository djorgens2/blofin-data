//+---------------------------------------------------------------------------------------+
//|                                                                           response.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest, IRequestState } from "@db/interfaces/state";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { hexify } from "@lib/crypto.util";

import * as States from "@db/interfaces/state";

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
//| Sets request states based on changes recieved from WSS/API or POST ops;              |
//+--------------------------------------------------------------------------------------+
export const Request = async (props: { results: TResponse[]; success: TRequest; fail: TRequest }) => {
  const accepted = [];
  const rejected = [];
  const errors = [];
  const { results, success, fail } = props;

  if (Array.isArray(results)) {
    for (const result of results) {
      const { code, msg, orderId, clientOrderId } = result;
      const [{ state, status }] = await States.Fetch<IRequestState>({ status: code ? success : fail });
      const response: Partial<IResponse> = {
        code,
        msg,
        request: hexify(clientOrderId, 6),
        order_id: hexify(parseInt(result.orderId), 6),
        state,
        status,
        memo: `[${code}: ${msg}] [${orderId},${clientOrderId}] ${new Date(Date.now()).toISOString()} Order status set to ${status}`,
        create_time: new Date(Date.now()),
        update_time: new Date(Date.now()),
      };

      const sql = `UPDATE blofin.request SET state = ?, update_time = now(3) WHERE request = ?`;
      const args = [response.state, response.request];

      if (response.code === "0") {
        try {
          await Modify(sql, args);
          accepted.push(response);
        } catch (e) {
          console.log({ sql, fields: ["state", "request"], args });
          console.log(e);
          errors.push(response);
        }
      } else rejected.push(response);
    }
  }

  return [accepted, rejected, errors];
}; 
