//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

// export const OrderType = {
//   Market: "market",
//   Limit: "limit",
//   Post: "post_only",
//   FoK: "fill-or",
//   IoC: "Suspended",
//   Deleted: "Deleted",
//   Expired: "Expired",
// } as const;
// export type Status = (typeof Status)[keyof typeof Status];
// export const OrderTypes: Array<{ type: Status; description: string }> = [
//   { type: "market", description: "market order" },
//   { type: "limit", description: "limit order" },
//   { type: "post_only", description: "Post-only order" },
//   { type: "fok", description: "Fill-or-kill order" },
//   { type: "ioc", description: "Immediate-or-cancel order" },
// ];

// export interface IKeyProps {
//   state?: Uint8Array;
//   status?: string | Status;
// }

//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  ["buy", "sell"].forEach((action) => Add("action", { action }));
  ["short", "long", "net"].forEach((bias) => Add("bias", { bias }));
  [
    { order_state: 0, source_ref: "live", status: "Live" },
    { order_state: 0, source_ref: "effective", status: "Effective" },
    { order_state: 0, source_ref: "canceled", status: "Canceled" },
    { order_state: 0, source_ref: "order_failed", status: "Order Failed" },
    { order_state: 0, source_ref: "filled", status: "Filled" },
    { order_state: 0, source_ref: "partially_canceled", status: "Partially Canceled" },
    { order_state: 0, source_ref: "partially_filled", status: "Partially Filled" },
  ].forEach((state) => Add("order_state", state));
  [
    { order_type: 0, source_ref: "market", description: "Market order" },
    { order_type: 0, source_ref: "limit", description: "Limit order" },
    { order_type: 0, source_ref: "post_only", description: "Post-only order" },
    { order_type: 0, source_ref: "fok", description: "Fill-or-kill order" },
    { order_type: 0, source_ref: "ioc", description: "Immediate-or-cancel order" },
    { order_type: 0, source_ref: "gtc", description: "Good-til-Canceled order" },
  ].forEach((type) => Add("order_type", type));
  [
    { cancel: 0, source_ref: "not_canceled", source: "Open, Not Canceled" },
    { cancel: 0, source_ref: "user_canceled", source: "Canceled by User" },
    { cancel: 0, source_ref: "system_canceled", source: "Canceled by System" },
  ].forEach((type) => Add("cancel", type));
  ["last", "index", "mark"].forEach((price_type) => Add("price_type", { price_type }));
  ["cross", "isolated"].forEach((margin_mode) => Add("margin_mode", { margin_mode }));
  [
    { category: 0, source_ref: "normal", description: "Normal", trigger_type: false },
    { category: 0, source_ref: "full_liquidation", description: "Full Liquidation", trigger_type: false },
    { category: 0, source_ref: "partial_liquidation", description: "Partial Liquidation", trigger_type: false },
    { category: 0, source_ref: "adl", description: "Auto-Deleveraging", trigger_type: false },
    { category: 0, source_ref: "tp", description: "Take Profit", trigger_type: true },
    { category: 0, source_ref: "sl", description: "Stop Loss", trigger_type: true },
  ].forEach((category) => Add("category", category));
};

//+--------------------------------------------------------------------------------------+
//| Adds seed references for fk's to local database;                                     |
//+--------------------------------------------------------------------------------------+
export async function Add(table: string, data: object) {
  const [fields, args] = parseColumns(data, "");
  const values = [" ?", " ?", " ?", " ?"];

  if (fields) {
    args[0] === 0 && (args[0] = hashKey(6));
    const sql = `INSERT IGNORE INTO blofin.${table} ( ${fields.join(", ")} ) VALUES (${values.slice(0, args.length)} )`;
    await Modify(sql, args);
    return args[0];
  }
  return undefined;
}

/*
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["state"] | undefined> {
  const { status, state } = props;
  const args = [];

  let sql: string = `SELECT state FROM blofin.state WHERE `;

  if (state) {
    args.push(state);
    sql += `state = ?`;
  } else if (status) {
    args.push(status);
    sql += `status = ?`;
  } else return undefined;

  const [key] = await Select<IState>(sql, args);
  return key === undefined ? undefined : key.state;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
  const { state, status } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.state`;

  if (state) {
    args.push(state);
    sql += ` WHERE state = ?`;
  } else if (status) {
    args.push(status);
    sql += ` WHERE status = ?`;
  }

  return Select<IState>(sql, args);
}
*/
