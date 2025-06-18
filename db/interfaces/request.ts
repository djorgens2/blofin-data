//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "@api/requests";
import type { IRequestState } from "@db/interfaces/state";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { hashKey, hexify } from "@lib/crypto.util";

import * as States from "@db/interfaces/state";

export interface IRequest {
  request: Uint8Array;
  state: Uint8Array;
  status: States.TRequest;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  margin_mode: "cross" | "isolated";
  position: "short" | "long" | "net";
  action: "buy" | "sell";
  order_type: Uint8Array;
  price: number;
  size: number;
  leverage: number;
  memo: string;
  reduce_only: boolean;
  broker_id: string;
  expiry_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Queue(props: Partial<IRequestAPI>): Promise<Array<Partial<IRequestAPI>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_api_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IRequestAPI>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IRequest>): Promise<IRequest["request"] | undefined> {
  const key = props.request ? props.request : hexify(hashKey(6));
  const [{ state }] = await States.Fetch<IRequestState>({ status: "Queued" });
  const [fields, args] = parseColumns({ ...props, request: key, state }, "");
  const sql = `INSERT INTO blofin.request ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;

  await Modify(sql, args);

  return key;
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IRequest>): Promise<Array<Partial<IRequest>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IRequest>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Updates the request states via WSS or API;                                           |
//+--------------------------------------------------------------------------------------+
export async function Update(props: Partial<IRequest>) {
  const { request, status, memo } = props;
  const state = await States.Key<IRequestState>({ status });
  const sql = `UPDATE blofin.request SET state = ?, memo = ? WHERE request = ?`;
  const args = [state, memo, request];
  await Modify(sql, args);
}
