//+--------------------------------------------------------------------------------------+
//|                                                                            orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IOrder } from "@db/interfaces/order";

import { Select, parseColumns } from "@db/query.utils";
import { Session, signRequest } from "@module/session";
import { IKeyProps } from "@db/interfaces/reference";
import { hexify } from "@lib/crypto.util";
import { hexString, isEqual, setExpiry } from "@lib/std.util";

import * as States from "@db/interfaces/state";
import * as Orders from "@db/interfaces/order";
import * as Request from "@db/interfaces/request";
import * as Reference from "@db/interfaces/reference";
import * as Instrument from "@db/interfaces/instrument";
import * as InstrumentType from "@db/interfaces/instrument_type";

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
  tpTriggerPrice: undefined | null;
  tpOrderPrice: undefined | null;
  slTriggerPrice: undefined | null;
  slOrderPrice: undefined | null;
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
  algoClientOrderId?: string;
  algoId?: string;
  filled_amount?: string;
}

export type TResponse = {
  orderId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Submit(props: Array<Partial<IRequestAPI>>) {
  if (props.length > 0) {
    const method = "POST";
    const path = "/api/v1/trade/batch-orders";
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
      .then((json) => {
        if (json.code === 0) Request.Update(json.data);
        else {
          console.log(json, json.data, method, headers, body);
          throw new Error(json);
        }
      })
      .catch((error) => console.log(error));
  }
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
//| Formats and emits order requests to broker for execution;                            |
//+--------------------------------------------------------------------------------------+
async function ProcessRequests(): Promise<number> {
  console.log("starting executing...");
  const requests = await Request.Queue({ status: "Queued" });
  const queue: Array<Partial<IRequestAPI>> = [];

  for (const id in requests) {
    const request = requests[id];
    const custKey = hexify(request.clientOrderId!);
    const api: Partial<IRequestAPI> = {
      instId: request.instId!,
      marginMode: request.marginMode!,
      positionSide: request.positionSide!,
      side: request.side!,
      orderType: request.orderType!,
      price: request.price!,
      size: request.size!,
      leverage: request.leverage!,
      reduceOnly: request.reduceOnly!,
      clientOrderId: hexString(custKey!, 3),
      brokerId: request.brokerId ? request.brokerId : undefined,
    };
    queue.push(api);
  }
  await Submit(queue);
  return requests.length;
}

//+--------------------------------------------------------------------------------------+
//| Update - scrubs blofin wss updates, applies keys, and executes merge to local db;    |
//+--------------------------------------------------------------------------------------+
export async function Update(orders: Array<Partial<IOrderAPI>>) {
  //await Publish(orders);
  console.log("imin order publishing");
}

//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export async function Publish(orders: Array<Partial<IOrderAPI>>) {
  for (const id in orders) {
    const order = orders[id];
    const instrument = await Instrument.Key({ symbol: order.instId });

    if (order.clientOrderId) {
      const request = await Request.Fetch({ request: hexify(order.clientOrderId) });
      const inst_type_default = await InstrumentType.Key({ source_ref: "SWAP" });
      const instrument_type = await InstrumentType.Key({ source_ref: order.instType });

      const [cancel_default] = await Reference.Fetch<IKeyProps>("cancel_source", { source_ref: "not_canceled" });
      const [apiState] = await Reference.Fetch<IKeyProps>("order_state", { source_ref: order.state });
      const [apiOrderType] = await Reference.Fetch<IKeyProps>("order_type", { source_ref: order.orderType });
      const [apiCategory] = await Reference.Fetch<IKeyProps>("order_category", { source_ref: order.orderCategory });
      const [apiCancel] = await Reference.Fetch<IKeyProps>("cancel_source", { source_ref: order.cancelSource });

      const update: Partial<IOrder> = {
        client_order_id: hexify(order.clientOrderId!),
        instrument,
        instrument_type: instrument_type ? instrument_type : inst_type_default,
        order_id: order.orderId,
        price: parseFloat(order.price!),
        size: parseFloat(order.size!),
        order_type: apiOrderType?.order_type,
        action: order.side,
        position: order.positionSide,
        margin_mode: order.marginMode,
        filled_size: parseFloat(order.filledSize!),
        // @ts-ignore
        filled_amount: order.filledAmount ? parseFloat(order.filledAmount) : order.filled_amount ? parseFloat(order.filled_amount) : undefined,
        average_price: parseFloat(order.averagePrice!),
        state: apiState?.state,
        leverage: parseInt(order.leverage!),
        fee: parseFloat(order.fee!),
        pnl: parseFloat(order.pnl!),
        order_category: apiCategory?.order_category,
        cancel_source: apiCancel?.cancel_source ? apiCancel.cancel_source : cancel_default!.cancel_source,
        reduce_only: order.reduceOnly === "true" ? true : false,
        broker_id: order.brokerId?.length ? order.brokerId : undefined,
        create_time: parseInt(order.createTime!),
        update_time: parseInt(order.updateTime!),
      };

      //-- handle missing requests
      if (request === undefined) {
        instrument &&
          Request.Submit({
            request: update.client_order_id,
            account: Session().account,
            instrument,
            position: update.position,
            action: update.action,
            price: update.price,
            size: update.size,
            leverage: update.leverage,
            order_type: update.order_type,
            margin_mode: update.margin_mode,
            reduce_only: update.reduce_only,
            memo: "Request missing; auto-submit;",
            expiry_time: setExpiry("1h"), //--- need a default expiry mechanism
          });
      }

      instrument && (await Orders.Publish(update));
    } else {
      //-- handle untracked order;
    }
  }
  console.log("done publishing...");
}

//+--------------------------------------------------------------------------------------+
//| Scheduled process retrieves active orders; reconciles with local db; Executes queued;|
//+--------------------------------------------------------------------------------------+
export async function Import() {
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

  await fetch(rest_api_url!.concat(path), {
    method,
    headers,
  })
    .then((response) => response.json())
    .then( async (json) => {
      if (json?.code === 0) throw new Error(json);

      await Publish(json.data);
      await ProcessRequests();
    })
    .catch((error) => console.log(error));
}
