//+--------------------------------------------------------------------------------------+
//|                                                                            orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IRequestAPI } from "@api/requests";
import type { IRequest } from "@db/interfaces/request";
import type { IOrder } from "@db/interfaces/order";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { parseJSON, setExpiry } from "@lib/std.util";

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
export async function Update(response: Array<TResponse>) {
  const history = await History();
  for (const id in response) {
    const { code, msg, orderId, clientOrderId } = response[id];
    const order = hexify(clientOrderId);
    const update = { order };

    code === "0"
      ? Object.assign(update, { ...update, status: "Canceled", memo: `[${code}]: ${msg}; ${orderId}` })
      : Object.assign(update, { ...update, status: "Rejected", memo: `[${code}]: ${msg}` });
    order && (await Order.Update(update));
  }
  // console.log("Instruments Suspended: ", suspense.length, ssuspense);
  // console.log("Instruments Updated: ", modified.length, modified);
  // await Currency.Suspend(suspense);
  // await Instrument.Suspend(suspense);
  // await InstrumentDetail.Update(modified);
}

//+--------------------------------------------------------------------------------------+
//| Resubmit - closes untracked pending order batch; resubmits on success cancellation;  |
//+--------------------------------------------------------------------------------------+
export async function Resubmit(cancels: Array<TResponse>, resubs: Array<Partial<IRequest>>) {
  console.log(`In Resubmit [API]: Resubmissions [${resubs.length}]`);
  for (const resub in cancels) {
    if (cancels[resub].code === '0') {
    console.log("Resubmitted:", cancels[resub], resubs[resub]);
    await Request.Submit(resubs[resub]);
  }}
}

//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export async function Publish(orders: Array<Partial<IOrderAPI>>) {
  console.log("In Orders.Publish [API]");
  const cancels: Array<Partial<IOrderAPI>> = [];
  const resubs: Array<Partial<IRequest>> = [];

  for (const id in orders) {
    const order = orders[id];
    const client_order_id = order.clientOrderId! ? hexify(order.clientOrderId!) : undefined;
    const request = client_order_id ? await Request.Fetch({ request: client_order_id }) : undefined;
    const instrument = await Instrument.Key({ symbol: order.instId });
    const instrument_type = await InstrumentType.Key({ source_ref: order.instType });
    const inst_type_default = await InstrumentType.Key({ source_ref: "SWAP" });
    const cancel_default = await Reference.Key<Uint8Array>("cancel_source", { source_ref: "not_canceled" });
    const cancel_source = await Reference.Key<Uint8Array>("cancel_source", { source_ref: order.cancelSource });
    const state = await Reference.Key<Uint8Array>("order_state", { source_ref: order.state });
    const order_type = await Reference.Key<Uint8Array>("order_type", { source_ref: order.orderType });
    const order_category = await Reference.Key<Uint8Array>("order_category", { source_ref: order.orderCategory });
    const update: Partial<IOrder> = {
      client_order_id,
      instrument,
      instrument_type: instrument_type ? instrument_type : inst_type_default,
      order_id: order.orderId,
      price: parseFloat(order.price!),
      size: parseFloat(order.size!),
      order_type,
      action: order.side,
      position: order.positionSide,
      margin_mode: order.marginMode,
      filled_size: parseFloat(order.filledSize!),
      filled_amount: order.filledAmount ? parseFloat(order.filledAmount) : order.filled_amount ? parseFloat(order.filled_amount) : undefined,
      average_price: parseFloat(order.averagePrice!),
      state: state,
      leverage: parseInt(order.leverage!),
      fee: parseFloat(order.fee!),
      pnl: parseFloat(order.pnl!),
      order_category: order_category!,
      cancel_source: cancel_source ? cancel_source : cancel_default,
      reduce_only: order.reduceOnly === "true" ? true : false,
      broker_id: order.brokerId?.length ? order.brokerId : undefined,
      create_time: parseInt(order.createTime!),
      update_time: parseInt(order.updateTime!),
    };

    if (instrument) {
      if (request) {
        await Orders.Publish(update);
      } else {
        const request = {
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
          expiry_time: setExpiry("1h"), //--- need a default expiry mechanism
        };

        //-- handle missing requests
        if (order.state === "live")
          if (update.client_order_id) {
            await Request.Submit({ ...request, request: client_order_id, memo: `Request [${client_order_id}] missing; auto-submit;` });
            await Orders.Publish(update);
          } else {
            cancels.push(order);
            resubs.push(request);
          }
      }
    }
  }
  //-- handle out-of-app orders
  if (cancels.length) {
    const results = await Cancel(cancels);
    const resubmit = await Resubmit(results, resubs);
  }
}

//+--------------------------------------------------------------------------------------+
//| Scheduled process retrieves active orders; reconciles with local db; Executes queued;|
//+--------------------------------------------------------------------------------------+
export async function Import() {
  console.log("In Import.Orders [API]");
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

//+--------------------------------------------------------------------------------------+
//| Cancel - closes pending order batch;                                                 |
//+--------------------------------------------------------------------------------------+
export async function Cancel(cancels: Array<Partial<IOrderAPI>>) {
  console.log(`In Cancel [API]: Cancellations [${cancels.length}]`);
  const method = "POST";
  const path = "/api/v1/trade/cancel-batch-orders";
  const body = JSON.stringify(cancels.map(({ instId, orderId, clientOrderId }) => ({ instId, orderId, clientOrderId })));
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

  try {
    const response = await fetch(rest_api_url!.concat(path), {
      method,
      headers,
      body,
    });

    if (response.ok) {
      const json = await response.json();
      return json.data;
    }
  } catch (error) {
    console.log(error);
  }
}

//+--------------------------------------------------------------------------------------+
//| History - retrieves orders no longer active;                                         |
//+--------------------------------------------------------------------------------------+
export async function History() {
  console.log("In History Fetch [API]");
  const method = "GET";
  const path = "/api/v1/trade/orders-history";
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

  try {
    const response = await fetch(rest_api_url!.concat(path), {
      method,
      headers,
    });

    if (response.ok) {
      const json = await response.json();
      return json.data;
    }
  } catch (error) {
    console.log(error);
  }
}
