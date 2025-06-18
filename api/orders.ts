//+--------------------------------------------------------------------------------------+
//|                                                                            orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IOrder } from "@db/interfaces/order";
import type { IRequestAPI } from "@api/requests";

import { Session, signRequest } from "@module/session";
import { IKeyProps } from "@db/interfaces/reference";
import { hexify } from "@lib/crypto.util";
import { hexString, isEqual, setExpiry } from "@lib/std.util";

import * as RequestAPI from "@api/requests";
import * as Orders from "@db/interfaces/order";
import * as Request from "@db/interfaces/request";
import * as Reference from "@db/interfaces/reference";
import * as Instrument from "@db/interfaces/instrument";
import * as InstrumentType from "@db/interfaces/instrument_type";

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
      const [request] = await Request.Fetch({ request: hexify(order.clientOrderId) });
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
          (await Request.Publish({
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
          }));
      }

      instrument && (await Orders.Publish(update));
    } else {
      //-- handle untracked order;
    }
  }
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
    .then(async (json) => {
      if (json.code === "0") {

        await Publish(json.data);
        await RequestAPI.Process();
      } else {
        throw new Error(json);
      }
    })
    .catch((error) => console.log(error));
}
