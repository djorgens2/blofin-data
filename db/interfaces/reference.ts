//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";
import { TRequest } from "./state";

export interface IKeyProps {
  table: string | undefined;
  order_state?: Uint8Array | undefined;
  request_type?: Uint8Array;
  cancel_source?: Uint8Array | undefined;
  order_category?: Uint8Array | undefined;
  source_ref: string;
  map_ref: TRequest;
}

//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  [
    { state: 0, source_ref: "live", map_ref: "Pending", status: "Live" },
    { state: 0, source_ref: "effective", map_ref: "Pending", status: "Effective" },
    { state: 0, source_ref: "canceled", map_ref: "Closed", status: "Canceled" },
    { state: 0, source_ref: "order_failed", map_ref: "Rejected", status: "Order Failed" },
    { state: 0, source_ref: "filled", map_ref: "Fulfilled", status: "Filled" },
    { state: 0, source_ref: "partially_canceled", map_ref: "Closed", status: "Partially Canceled" },
    { state: 0, source_ref: "partially_filled", map_ref: "Pending", status: "Partially Filled" },
  ].forEach((state) => Add("order_state", state));
  [
    { request_type: 0, source_ref: "market", description: "Market order" },
    { request_type: 0, source_ref: "limit", description: "Limit order" },
    { request_type: 0, source_ref: "post_only", description: "Post-only order" },
    { request_type: 0, source_ref: "fok", description: "Fill-or-kill order" },
    { request_type: 0, source_ref: "ioc", description: "Immediate-or-cancel order" },
    { request_type: 0, source_ref: "trigger", description: "Trigger or algo order" },
  ].forEach((type) => Add("request_type", type));
  [
    { cancel_source: 0, source_ref: "not_canceled", source: "None" },
    { cancel_source: 0, source_ref: "user_canceled", source: "User" },
    { cancel_source: 0, source_ref: "system_canceled", source: "System" },
  ].forEach((type) => Add("cancel", type));
  ["last", "index", "mark"].forEach((price_type) => Add("price_type", { price_type }));
  ["cross", "isolated"].forEach((margin_mode) => Add("margin_mode", { margin_mode }));
  [
    { order_category: 0, source_ref: "normal", description: "Normal", trigger_type: false },
    { order_category: 0, source_ref: "full_liquidation", description: "Full Liquidation", trigger_type: false },
    { order_category: 0, source_ref: "partial_liquidation", description: "Partial Liquidation", trigger_type: false },
    { order_category: 0, source_ref: "adl", description: "Auto-Deleveraging", trigger_type: false },
    { order_category: 0, source_ref: "tp", description: "Take Profit", trigger_type: true },
    { order_category: 0, source_ref: "sl", description: "Stop Loss", trigger_type: true },
  ].forEach((category) => Add("order_category", category));
};

//+--------------------------------------------------------------------------------------+
//| Adds seed references for fk's/referential integrity to local database;               |
//+--------------------------------------------------------------------------------------+
export async function Add(table: string, data: object) {
  const [fields, args] = parseColumns(data, "");

  if (fields) {
    args[0] === 0 && (args[0] = hashKey(6));
    const sql = `INSERT IGNORE INTO blofin.${table} ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;
    await Modify(sql, args);
    return args[0];
  }
  return undefined;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns data;   |
//+--------------------------------------------------------------------------------------+
export async function Fetch(table: string, props: Partial<IKeyProps>): Promise<Array<Partial<IKeyProps> | undefined>> {
  const [fields, args] = parseColumns(props);
  const sql: string = `SELECT * FROM blofin.${table} ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;

  if (Object.keys(props).length && !fields.length) return [undefined];

  return Select<IKeyProps>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key<T>(table: string, props: Partial<IKeyProps>): Promise<T | undefined> {
  const [fields, args] = parseColumns(props);
  const sql: string = `SELECT ${table} FROM blofin.${table} ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;

  if (Object.keys(props).length && !fields.length) return undefined;

  const [key] = await Select<T>(sql, args);
  //@ts-ignore
  return key ? key[table] : undefined;
}
