//+---------------------------------------------------------------------------------------+
//|                                                                          reference.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest } from "db/interfaces/state";
import type { TOptions } from "db/query.utils";
import type { IPublishResult } from "db/query.utils";

import { Select, Insert, PrimaryKey } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

export type TRefKey = Uint8Array;
export type TRefText = string;

export interface IReference {
  table: string;
  state: Uint8Array;
  order_state: Uint8Array;
  request_type: Uint8Array;
  cancel_source: Uint8Array;
  order_category: Uint8Array;
  source_ref: string;
  status: string;
  map_ref: TRequest;
  [key: string]: unknown;
}

//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Reference.Import:", new Date().toLocaleString());

  const counts = {
    orderState: 0,
    requestType: 0,
    cancelSource: 0,
    priceType: 0,
    marginMode: 0,
    hedging: 0,
    stopType: 0,
    position: 0,
    orderCategory: 0,
  };

  [
    { order_state: 0, source_ref: "live", status: "Pending", description: "Live" },
    { order_state: 0, source_ref: "effective", status: "Pending", description: "Effective" },
    { order_state: 0, source_ref: "canceled", status: "Closed", description: "Canceled" },
    { order_state: 0, source_ref: "order_failed", status: "Rejected", description: "Order Failed" },
    { order_state: 0, source_ref: "filled", status: "Fulfilled", description: "Filled" },
    { order_state: 0, source_ref: "partially_canceled", status: "Closed", description: "Partially Canceled" },
    { order_state: 0, source_ref: "partially_filled", status: "Pending", description: "Partially Filled" },
  ].forEach((state) => {
    Add("order_state", state), counts.orderState++;
  });
  [
    { request_type: 0, source_ref: "market", description: "Market order" },
    { request_type: 0, source_ref: "limit", description: "Limit order" },
    { request_type: 0, source_ref: "post_only", description: "Post-only order" },
    { request_type: 0, source_ref: "fok", description: "Fill-or-kill order" },
    { request_type: 0, source_ref: "ioc", description: "Immediate-or-cancel order" },
    { request_type: 0, source_ref: "trigger", description: "Trigger or algo order" },
  ].forEach((type) => {
    Add("request_type", type), counts.requestType++;
  });
  [
    { cancel_source: 0, source_ref: "not_canceled", source: "None" },
    { cancel_source: 0, source_ref: "user_canceled", source: "User" },
    { cancel_source: 0, source_ref: "system_canceled", source: "System" },
  ].forEach((type) => {
    Add("cancel_source", type), counts.cancelSource++;
  });
  ["last", "index", "mark"].forEach((price_type) => {
    Add("price_type", { price_type }), counts.priceType++;
  });
  [
    { hedging: true, source_ref: "long_short_mode", description: "Hedged" },
    { hedging: false, source_ref: "net_mode", description: "Unhedged" },
  ].forEach((mode) => {
    Add("hedging", mode), counts.hedging++;
  });
  ["cross", "isolated"].forEach((margin_mode) => {
    Add("margin_mode", { margin_mode }), counts.marginMode++;
  });
  ["tp", "sl"].forEach((stop_type) => {
    Add("stop_type", { stop_type }), counts.stopType++;
  });
  ["long", "short", "net"].forEach((position) => {
    Add("position", { position }), counts.position++;
  });
  [
    { order_category: 0, source_ref: "normal", description: "Normal" },
    { order_category: 0, source_ref: "full_liquidation", description: "Full Liquidation" },
    { order_category: 0, source_ref: "partial_liquidation", description: "Partial Liquidation" },
    { order_category: 0, source_ref: "adl", description: "Auto-Deleveraging" },
    { order_category: 0, source_ref: "tp", description: "Take Profit" },
    { order_category: 0, source_ref: "sl", description: "Stop Loss" },
  ].forEach((category) => {
    Add("order_category", category), counts.orderCategory++;
  });

  Object.entries(counts).forEach(([Key, value]) =>
    console.log(
      `   # ${
        Key.charAt(0).toUpperCase() +
        Key.slice(1)
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .split(" ")
          .join(" ")
      } imports:  ${value} verified`
    )
  );
};

//+--------------------------------------------------------------------------------------+
//| Adds seed references for fk's/referential integrity to local database;               |
//+--------------------------------------------------------------------------------------+
export const Add = async (table: string, props: { [key: string]: any }) => {
  if (Object.keys(props).length) {
    props[Object.keys(props)[0]] === 0 && (props[Object.keys(props)[0]] = hashKey(6));
    const result = await Insert<IReference>(props, { table, ignore: true });
    return result;
  }
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns data;   |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IReference>, options: TOptions): Promise<Array<Partial<IReference>> | undefined> => {
  const result = await Select<IReference>(props, options);
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export const Key = async <T>(props: Partial<IReference>, options: TOptions): Promise<T | undefined> => {
  if (hasValues<Partial<IReference>>(props)) {
    const [key] = await Select<IReference>(props, options);
    return key ? (Object.values(key)[0] as T) : undefined;
  } else return undefined;
};
