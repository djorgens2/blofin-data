//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TResponse } from "@module/trades";
import type { IRequestAPI } from "@api/requests";
import type { IRequestState, TRequest } from "@db/interfaces/state";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { Session } from "@module/session";
import { hashKey, hexify } from "@lib/crypto.util";

import * as States from "@db/interfaces/state";

export interface IRequest {
  request: Uint8Array;
  order_id: string | number;
  client_order_id: string | undefined;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  state: Uint8Array;
  status: TRequest;
  order_state: Uint8Array;
  order_status: TRequest;
  margin_mode: "cross" | "isolated";
  position: "short" | "long" | "net";
  action: "buy" | "sell";
  request_type: Uint8Array;
  order_type: string;
  price: number;
  size: number;
  leverage: number;
  digits: number;
  memo: string;
  reduce_only: boolean;
  broker_id: string;
  expiry_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export const Queue = async (props: Partial<IRequestAPI>): Promise<Array<Partial<IRequestAPI>>> => {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_api_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;

  return Select<IRequestAPI>(sql, args);
};

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const { account } = Session();
  const { status } = props;
  const key = props.request ? props.request : hexify(hashKey(10));
  const state = props.state ? props.state : await States.Key<IRequestState>({ status: "Queued" });
  const [fields, args] = parseColumns({ ...props, request: key, state, account }, "");
  const sql = `INSERT INTO blofin.request ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;

  await Modify(sql, args);

  return key;
};

//+--------------------------------------------------------------------------------------+
//| Resubmit - closes untracked pending order batch; resubmits on success cancellation;  |
//+--------------------------------------------------------------------------------------+
export const Resubmit = async (cancels: Array<TResponse>, resubs: Array<Partial<IRequest>>) => {
  console.log(`In Resubmit [API]: Resubmissions [${resubs.length}]`);
  for (const request in cancels) {
    if (cancels[request].code === "0") {
      await Submit(resubs[request]);
    }
  }
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IRequest>): Promise<Array<Partial<IRequest>>> => {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;

  return Select<IRequest>(sql, args);
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT request FROM blofin.vw_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  const key = await Select<IRequest>(sql, args);
  const request = key.length === 1 ? key[0].request : undefined;

  return request;
};

//+--------------------------------------------------------------------------------------+
//| Updates the request states via WSS or API;                                           |
//+--------------------------------------------------------------------------------------+
export const Update = async (props: Partial<IRequest>) => {
  const { request, status, memo } = props;
  const state = await States.Key<IRequestState>({ status });
  const sql = `UPDATE blofin.request SET state = ?, memo = ? WHERE request = ?`;
  const args = [state, memo, request];

  await Modify(sql, args);
};
