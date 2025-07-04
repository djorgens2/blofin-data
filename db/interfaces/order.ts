//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "@db/interfaces/request";

import { Modify, parseColumns, Select } from "@db/query.utils";

export interface IOrder extends IRequest {
  instrument_type: Uint8Array;
  order_category: Uint8Array;
  category: string;
  cancel_source: Uint8Array;
  canceled_by: string;
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
//| Publish - Conducts detail level scrub; updates order to local db;                    |
//+--------------------------------------------------------------------------------------+
export async function Update(props: Partial<IOrder>) {
const { request, order_id, client_order_id, instrument, create_time, update_time, ...updates } = props;
const [fields, args] = parseColumns(updates);
const sql = `UPDATE blofin.orders SET ${fields.join(" = ?, ")}${ create_time ? `, create_time = FROM_UNIXTIME(?/1000)` : ``}${update_time ? `, update_time = FROM_UNIXTIME(?/1000)` : ``} WHERE request = ?`;
return Modify(sql,[...args, request]);
}

//+--------------------------------------------------------------------------------------+
//| Publish - Conducts high level scrub; updates/adds new order to local db;             |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IOrder>) {
  const { request, instrument, create_time, update_time, ...order } = props;
  const [fields, args] = parseColumns(order, "");
  if (fields) {
    try {
      const sql =
        `INSERT INTO blofin.orders (${fields.join(", ")}, request, create_time, update_time) VALUES (${Array(args.length)
          .fill("?")
          .join(", ")}, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000)) ` +
        `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")} = ?, create_time = FROM_UNIXTIME(?/1000), update_time = FROM_UNIXTIME(?/1000)`;
      await Modify(sql, [...args, request, create_time, update_time, ...args, create_time, update_time]);
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
  const sql = `SELECT * FROM blofin.vw_orders ${fields.length ? "WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IRequest>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Fetches orders from local db that meet props criteria;                               |
//+--------------------------------------------------------------------------------------+
export async function Key(props: Partial<IOrder>): Promise<IOrder["request"] | undefined> {
  const { order_id, client_order_id } = props;
  const [fields, args] = parseColumns(props);
  const sql = `SELECT request FROM blofin.vw_orders ${fields.length ? "WHERE ".concat(fields.join(" AND ")) : ""}`;
  const keys = await Select<IOrder>(sql, args);

  if (keys.length === 1) {
    const key = keys[0];
    if (order_id)
      if (order_id === key.order_id) return key.request;
      else return undefined;

    if (client_order_id)
      if (client_order_id === key.client_order_id) return key.request;
      else return undefined;

    return key.request;
  }
  return undefined;
}
