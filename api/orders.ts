//+--------------------------------------------------------------------------------------+
//|                                                                            orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IOrder } from "@db/interfaces/order";

import * as State from "@db/interfaces/state";
import * as Request from "@db/interfaces/order";
import * as Reference from "@db/interfaces/reference";
import * as Instrument from "@db/interfaces/instrument";
import * as InstrumentType from "@db/interfaces/instrument_type";

import { parseColumns } from "@db/query.utils";
import { Select } from "@db/query.utils";
import { Session, signRequest } from "@module/session";
import { IKeyProps } from "@db/interfaces/reference";
import { hexify } from "@lib/crypto.util";

export interface IRequestAPI {
  status?: string;
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  side: "buy" | "sell";
  orderType: string;
  price: string;
  size: string;
  leverage: string;
  reduceOnly: string;
  clientOrderId: string;
  tpTriggerPrice: string | undefined | null;
  tpOrderPrice: string | undefined | null;
  slTriggerPrice: string | undefined | null;
  slOrderPrice: string | undefined | null;
  brokerId: string | undefined;
  createTime: string;
  updateTime: string;
}

export interface IOrderAPI extends IRequestAPI {
  instType: string;
  orderId: string;
  clientOrderId: string;
  filledSize: string;
  filledAmount: string;
  averagePrice: string;
  state: string;
  fee: string;
  pnl: string;
  cancelSource: string;
  orderCategory: string;
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
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Submit(props: Partial<IRequestAPI>) {
  // @ts-ignore
  Object.keys(props).forEach((key) => props[key] === undefined && delete props[key]);
  const method = "POST";
  const path = "/api/v1/trade/order";
  const body = JSON.stringify(props);
  const { api, phrase, rest_api_url } = Session();
  const { sign, timestamp, nonce } = await signRequest(method, path, body);

  const headers = {
    "ACCESS-KEY": api!,
    "ACCESS-SIGN": sign!,
    "ACCESS-TIMESTAMP": timestamp!,
    "ACCESS-NONCE": nonce!,
    "ACCESS-PASSPHRASE": phrase!,
    "Content-Type": "application/json",
  };

  fetch(rest_api_url!.concat(path), {
    method,
    headers,
    body,
  })
    .then((response) => response.json())
    .then((json) => console.log(json))
    .catch((error) => console.log(error));

  // # Place order
  // response = requests.post(
  //     "https://openapi.blofin.com/api/v1/trade/order",
  //     headers=headers,
  //     json=order_request
  // )
  // response.raise_for_status()
  // order_response = response.json()

  // # Verify response format and success
  // if not isinstance(order_response, dict):
  //     raise Exception(f"Invalid order response format: {order_response}")

  // if "code" in order_response and order_response["code"] != "0":
  //     raise Exception(f"Order API error: {order_response}")

  // if "data" not in order_response:
  //     raise Exception(f"No data in order response: {order_response}")

  // order_id = order_response["data"][0]["orderId"]
  // print(f"Order placed: {order_id}")
}

//+--------------------------------------------------------------------------------------+
//| Merge - completes high-level request->order validation and applies inserts/updates;  |
//+--------------------------------------------------------------------------------------+
export async function Merge(order: Partial<IOrder>) {
  const { client_order_id, create_time, update_time, ...api } = order;
  const [status] = await Reference.Fetch<IKeyProps>("order_state", { state: order.state });
  const [request] = await Request.Fetch({ client_order_id });
  const state = await State.Key({ status: status!.map_ref });

  if (request) {
    if ((request.instrument = order.instrument)) {
      const [fields, args] = parseColumns(api);
      console.log("\napi:", api, "\nfields:", fields, "\nargs:", args);
      // const sql = `INSERT INTO blofin.requests ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;

      // await Modify(sql, args);
    }
  }
  // console.log("Instruments Suspended: ", suspense.length, suspense);
  // console.log("Instruments Updated: ", modified.length, modified);

  // await Currency.Suspend(suspense);
  // await Instrument.Suspend(suspense);
  // await InstrumentDetail.Update(modified);
}

//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export async function Publish(orders: Array<IOrderAPI>) {
  for (const id in orders) {
    const order = orders[id];
    const inst_type_dflt = await InstrumentType.Key({ source_ref: "SWAP" });
    const [cancel_dflt] = await Reference.Fetch<IKeyProps>("cancel", { source_ref: "not_canceled" });
    const instrument = await Instrument.Key({ symbol: order.instId });
    const instrument_type = await InstrumentType.Key({ source_ref: order.instType });
    const [apiState] = await Reference.Fetch<IKeyProps>("order_state", { source_ref: order.state });
    const [apiOrderType] = await Reference.Fetch<IKeyProps>("order_type", { source_ref: order.orderType });
    const [apiCategory] = await Reference.Fetch<IKeyProps>("category", { source_ref: order.orderCategory });
    const [apiCancel] = await Reference.Fetch<IKeyProps>("cancel", { source_ref: order.cancelSource });
    const update: Partial<IOrder> = {
      instrument,
      instrument_type: instrument_type ? instrument_type : inst_type_dflt,
      order_id: order.orderId,
      client_order_id: hexify(order.clientOrderId),
      price: parseFloat(order.price),
      size: parseFloat(order.size),
      order_type: apiOrderType!.order_type!,
      action: order.side,
      position: order.positionSide,
      margin_mode: order.marginMode,
      filled_size: parseFloat(order.filledSize),
      // @ts-ignore
      filled_amount: order.filledAmount ? parseFloat(order.filledAmount) : order.filled_amount ? parseFloat(order.filled_amount) : undefined,
      average_price: parseFloat(order.averagePrice),
      state: apiState!.state!,
      leverage: parseInt(order.leverage),
      fee: parseFloat(order.fee),
      pnl: parseFloat(order.pnl),
      category: apiCategory!.category!,
      cancel: apiCancel?.cancel ? apiCancel.cancel : cancel_dflt!.cancel,
      reduce_only: order.reduceOnly === "true" ? true : false,
      broker_id: order.brokerId,
      create_time: parseInt(order.createTime),
      update_time: parseInt(order.updateTime),
    };
    await Merge(update);
  }
}

//+--------------------------------------------------------------------------------------+
//| Audit - retrieves active orders; reconciles with local db;                           |
//+--------------------------------------------------------------------------------------+
export async function Audit() {
  const method = "GET";
  const path = "/api/v1/trade/orders-pending";
  const { api, phrase, rest_api_url } = Session();
  const { sign, timestamp, nonce } = await signRequest(method, path);
  const headers = {
    "ACCESS-KEY": api!,
    "ACCESS-SIGN": sign!,
    "ACCESS-TIMESTAMP": timestamp!,
    "ACCESS-NONCE": nonce!,
    "ACCESS-PASSPHRASE": phrase!,
    "Content-Type": "application/json",
  };

  fetch(rest_api_url!.concat(path), {
    method,
    headers,
  })
    .then((response) => response.json())
    .then((json) => {
      if (json?.code === 0) throw new Error(json);
      Publish(json.data);
    })
    .catch((error) => console.log(error));
}
