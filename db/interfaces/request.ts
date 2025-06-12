//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI, TResponse } from "@api/orders";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { hashKey, hexify } from "@lib/crypto.util";

import * as States from "@db/interfaces/state";
import * as Orders from "@db/interfaces/order";

export interface IRequest {
  client_order_id: Uint8Array;
  state: Uint8Array;
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
export async function Submit(props: Partial<IRequest>): Promise<IRequest["client_order_id"] | undefined> {
  const key = hexify(hashKey(6));
  const [{ state }] = await States.Fetch({ status: "Queued" });
  const [fields, args] = parseColumns({ ...props, client_order_id: key, state }, "");
  const sql = `INSERT INTO blofin.requests ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;

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
export async function Update(response: Array<TResponse>) {
  const states = await States.Fetch({});

  for (const id in response) {
    const update = response[id];
    const {orderId, clientOrderId} = update;
    const client_order_id = hexify(clientOrderId);

    if (update?.code) {
      const key = states.find(({ status }) => status === "Rejected");
      const sql = `UPDATE blofin.request SET state = ?, memo = ? WHERE clientOrderId = ?`;
      const args = [key?.state,`[${update.code}]: ${update.msg}`, hexify(clientOrderId)];

      await Modify(sql,args);
    } else {
      const [{ request_state }] = await Orders.Fetch({ client_order_id });

    }
  }
  // console.log("Instruments Suspended: ", suspense.length, suspense);
  // console.log("Instruments Updated: ", modified.length, modified);
  // await Currency.Suspend(suspense);
  // await Instrument.Suspend(suspense);
  // await InstrumentDetail.Update(modified);
}
