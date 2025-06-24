//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "@db/interfaces/request";

import { Modify, parseColumns, Select } from "@db/query.utils";

export interface IOrder extends IRequest {
  client_order_id: Uint8Array;
  order_id: string;
  request_state: Uint8Array;
  instrument_type: Uint8Array;
  order_category: Uint8Array;
  cancel_source: Uint8Array;
  orderId: string;
  filled_amount: number;
  filled_size: number;
  average_price: number;
  fee: number;
  pnl: number;
  create_time: Date | number;
  update_time: Date | number;
}

//+--------------------------------------------------------------------------------------+
//| Publish - Conducts high level scrub; updates/adds new order to local db;             |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IOrder>) {
  const { client_order_id, instrument, create_time, update_time, ...order } = props;
  const [fields, args] = parseColumns(order, "");
  if (fields) {
    try {
      const sql =
        `INSERT INTO blofin.orders (${fields.join(", ")}, client_order_id, create_time, update_time) VALUES (${Array(args.length)
          .fill("?")
          .join(", ")}, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000)) ` +
        `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")} = ?, create_time = FROM_UNIXTIME(?/1000), update_time = FROM_UNIXTIME(?/1000)`;

      await Modify(sql, [...args, client_order_id, create_time, update_time, ...args, create_time, update_time]);
      return 1;
    } catch (e) {
      console.log(e, props!);
    }
  }
}

//+--------------------------------------------------------------------------------------+
//| Fetches orders from local db that meet props criteria;                               |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IOrder>): Promise<Array<Partial<IOrder>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_orderss ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IRequest>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Updates the order states states via WSS or API;                                      |
//+--------------------------------------------------------------------------------------+
export async function Update(props: Partial<IOrder>) {
  // const { request, status, memo } = props;
  // const state = await States.Key<IRequestState>({ status });
  // const sql = `UPDATE blofin.request SET state = ?, memo = ? WHERE request = ?`;
  // const args = [state, memo, request];
  // await Modify(sql, args);
}
