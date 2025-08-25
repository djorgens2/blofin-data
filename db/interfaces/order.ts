//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "@db/interfaces/request";

import { Modify, parseColumns, Select } from "@db/query.utils";

export interface IOrder extends IRequest {
  orderId: string;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  request_state: Uint8Array;
  request_status: string;
  contract_type: string;
  instrument_type: string;
  order_category: Uint8Array;
  category: string;
  cancel_source: Uint8Array;
  canceled_by: string;
  filled_amount: number;
  filled_size: number;
  average_price: number;
  fee: number;
  pnl: number;
  trade_period: Uint8Array;
  trade_state: Uint8Array;
  trade_status: string;
  trade_timeframe: string;
  suspense: boolean;
}

export interface IOrderState {
  state: Uint8Array;
  status: string;
  order_state: Uint8Array;
  order_status: string;
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Update - applies updates to Orders on select columns;                                |
//+--------------------------------------------------------------------------------------+
const formatOrder = (unformatted: Partial<IOrder>): Partial<IOrder> => {
  const formatted = {
    request: unformatted.request,
    order_id: unformatted.order_id,
    price: unformatted.price,
    size: unformatted.size,
    request_type: unformatted.request_type,
    position: unformatted.position,
    action: unformatted.action,
    margin_mode: unformatted.margin_mode,
    filled_size: unformatted.filled_size,
    filled_amount: unformatted.filled_amount,
    average_price: unformatted.average_price,
    order_state: unformatted.order_state,
    leverage: unformatted.leverage,
    fee: unformatted.fee,
    pnl: unformatted.pnl,
    cancel_source: unformatted.cancel_source,
    order_category: unformatted.order_category,
    reduce_only: unformatted.reduce_only,
    broker_id: unformatted.broker_id,
    create_time: unformatted.create_time && new Date(unformatted.create_time),
    update_time: unformatted.update_time && new Date(unformatted.update_time),
  } as Partial<IOrder>;
  return formatted;
};

//+--------------------------------------------------------------------------------------+
//| Update - applies updates to Orders on select columns;                                |
//+--------------------------------------------------------------------------------------+
export const Update = async (order: Partial<IOrder>) => {
  const { request, ...updates } = formatOrder(order);
  const [fields, args] = parseColumns(updates);
  const sql = `UPDATE blofin.orders SET ${fields.join(", ")} WHERE request = ?`;

  args.push(request);

  return Modify(sql, args);
};

//+--------------------------------------------------------------------------------------+
//| Publish - Conducts high level scrub; updates/adds new order to local db;             |
//+--------------------------------------------------------------------------------------+
export const Publish = async (order: Partial<IOrder>) => {
  const request = formatOrder(order);
  const [fields, args] = parseColumns(request, "");
  const sql = `INSERT INTO blofin.orders (${fields.join(", ")}) VALUES (${Array(args.length).fill("?").join(", ")})`;

  try {
    await Modify(sql, args);
  } catch (e) {
    console.log({ sql, args, request });
    console.log(e);
  }
};

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

//+--------------------------------------------------------------------------------------+
//| Returns the state key for both orders and requests based on select columns;          |
//+--------------------------------------------------------------------------------------+
export const State = async (props: Partial<IOrderState>): Promise<IOrderState["state"] | undefined> => {
  const [fields, args] = parseColumns(props);

  if (fields.length) {
    const sql = `SELECT state FROM blofin.vw_order_states ${fields.length ? "WHERE ".concat(fields.join(" AND ")) : ""}`;
    const key = await Select<IOrder>(sql, args);
    return key.length ? key[0].state : undefined;
  }
  return undefined;
};
