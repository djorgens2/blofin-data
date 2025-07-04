//+--------------------------------------------------------------------------------------+
//|                                                                     [api]  orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IRequestAPI } from "@api/requests";
import type { IRequest } from "@db/interfaces/request";
import type { IOrder } from "@db/interfaces/order";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { isEqual, setExpiry } from "@lib/std.util";

import * as Orders from "@db/interfaces/order";
import * as Request from "@db/interfaces/request";
import * as State from "@db/interfaces/state";
import * as Reference from "@db/interfaces/reference";
import * as Instrument from "@db/interfaces/instrument";
import * as InstrumentType from "@db/interfaces/instrument_type";

export interface IOrderAPI extends IRequestAPI {
  instType: string;
  orderId: string;
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
type TCompare = "reject" | "accept" | "modify";

//+--------------------------------------------------------------------------------------+
//| Key - returns order id key (string/hex), searches key, returns t/f for existence;    |
//+--------------------------------------------------------------------------------------+
const Key = async (order: Partial<IOrderAPI>) => {
  const client_order_id = order.clientOrderId ? order.clientOrderId : parseInt(order.orderId!).toString(16);
  const request = hexify(order.clientOrderId ? order.clientOrderId : client_order_id, 6);
  const found = await Request.Key({ request });
  return { request, client_order_id, found };
};

//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export const Publish = async (orders: Array<Partial<IOrderAPI>>) => {
  console.log("In Orders.Publish [API]");
  const cancels: Array<Partial<IOrderAPI>> = [];
  const resubs: Array<Partial<IRequest>> = [];

  for (const order of orders) {
    const { request, client_order_id, found } = await Key(order);
    const instrument = await Instrument.Key({ symbol: order.instId });
    const instrument_type = await InstrumentType.Key({ source_ref: order.instType });
    const inst_type_default = await InstrumentType.Key({ source_ref: "SWAP" });
    const cancel_default = await Reference.Key<Uint8Array>("cancel_source", { source_ref: "not_canceled" });
    const cancel_source = await Reference.Key<Uint8Array>("cancel_source", { source_ref: order.cancelSource });
    const [stateRef] = await Reference.Fetch("order_state", { source_ref: order.state });
    const request_type = await Reference.Key<Uint8Array>("request_type", { source_ref: order.orderType });
    const order_category = await Reference.Key<Uint8Array>("order_category", { source_ref: order.orderCategory });
    const update: Partial<IOrder> = {
      request,
      order_id: order.orderId,
      instrument,
      instrument_type: instrument_type ? instrument_type : inst_type_default,
      price: parseFloat(order.price!),
      size: parseFloat(order.size!),
      request_type,
      action: order.side,
      position: order.positionSide,
      margin_mode: order.marginMode,
      filled_size: parseFloat(order.filledSize!),
      filled_amount: order.filledAmount ? parseFloat(order.filledAmount) : order.filled_amount ? parseFloat(order.filled_amount) : undefined,
      average_price: parseFloat(order.averagePrice!),
      order_state: stateRef?.order_state,
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
      if (found) {
        await Orders.Publish(update);
      } else {
        const state = await State.Key({ status: stateRef?.map_ref });
        const resubmit = {
          request,
          state,
          instrument,
          position: update.position,
          action: update.action,
          price: update.price,
          size: update.size,
          leverage: update.leverage,
          request_type,
          margin_mode: update.margin_mode,
          reduce_only: update.reduce_only,
          memo: `Request [${client_order_id}] missing; auto-submit;`,
          expiry_time: setExpiry("1h"), //--- need a default expiry mechanism
        };

        //-- handle missing requests
        await Request.Submit(resubmit);
        await Orders.Publish(update);
      }
    } else {
      console.log(`Error: Bad/Missing Symbol [${order.instId}]`);
    }
  }
};

//+--------------------------------------------------------------------------------------+
//| Scheduled process retrieves active orders; reconciles with local db; Executes queued;|
//+--------------------------------------------------------------------------------------+
const Pending = async (): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log("In Pending [API]");
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
    return [];
  }
};

//+--------------------------------------------------------------------------------------+
//| Cancel - closes pending orders by batch;                                             |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (cancels: Array<Partial<IOrderAPI>>) => {
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
};

//+--------------------------------------------------------------------------------------+
//| History - retrieves orders no longer active;                                         |
//+--------------------------------------------------------------------------------------+
const History = async (): Promise<Array<Partial<IOrderAPI>> | undefined> => {
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
    return [];
  }
};

//+--------------------------------------------------------------------------------------+
//| Scrubs orders on api/wss-timer, sets status, merges corrections/updates locally;     |
//+--------------------------------------------------------------------------------------+
const Compare = async (api: Partial<IOrderAPI>, request: IOrder["request"]): Promise<[TCompare, Partial<IOrderAPI>]> => {
  const [local] = await Orders.Fetch({ request });
  if (local.order_id === parseInt(api.orderId!)) {
    if (local.symbol === api.instId) {
      const change: Partial<IOrderAPI> = { orderId: api.orderId, clientOrderId: api.clientOrderId, instId: api.instId };

      api.positionSide && local.position !== api.positionSide! && (change.positionSide = api.positionSide);
      api.side && local.action !== api.side! && (change.side = api.side);
      api.marginMode && local.margin_mode !== api.marginMode! && (change.marginMode = api.marginMode);
      api.orderCategory && local.category !== api.orderCategory! && (change.orderCategory = api.orderCategory);
      api.state && local.order_status !== api.state! && (change.state = api.state);
      api.orderType && local.order_type !== api.orderType! && (change.orderType = api.orderType);
      api.cancelSource && local.canceled_by !== api.cancelSource! && (change.cancelSource = api.cancelSource);
      api.brokerId && local.broker_id !== api.brokerId! && (change.brokerId = api.brokerId);

      api.price && !isEqual(local.price!, api.price) && (change.price = api.price);
      api.size && !isEqual(local.size!, api.size) && (change.size = api.size);
      api.leverage && !isEqual(local.leverage!, api.leverage) && (change.leverage = api.leverage);
      api.filledSize && !isEqual(local.filled_size!, api.filledSize) && (change.filledSize = api.filledSize);
      api.filledAmount && !isEqual(local.filled_amount!, api.filledAmount) && (change.filledAmount = api.filledAmount);
      api.averagePrice && !isEqual(local.average_price!, api.averagePrice) && (change.averagePrice = api.averagePrice);
      api.fee && !isEqual(local.fee!, api.fee) && (change.fee = api.fee);
      api.pnl && !isEqual(local.pnl!, api.pnl) && (change.pnl = api.pnl);

      !isEqual(Math.trunc(new Date(local.create_time!).getTime() / 1000), parseInt(api.createTime!) / 1000, 0) && (change.createTime = api.createTime);
      !isEqual(Math.trunc(new Date(local.update_time!).getTime() / 1000), parseInt(api.updateTime!) / 1000, 0) && (change.updateTime = api.updateTime);

      !!local.reduce_only! !== (api.reduceOnly! === "true") && (change.reduceOnly = api.reduceOnly);

      if (Object.keys(change).length > 3) {
        return ["modify", change];
      }

      return ["accept", { orderId: api.orderId }];
    } else {
      return ["reject", { orderId: api.orderId }];
    }
  } else {
    return ["reject", { orderId: api.orderId }];
  }
};

//+--------------------------------------------------------------------------------------+
//| Scrubs orders on api/wss-timer, sets status, merges corrections/updates locally;     |
//+--------------------------------------------------------------------------------------+
export const Update = async (updates: Array<Partial<IOrderAPI>>) => {
  for (const update of updates) {
    const { orderId, clientOrderId, instId, cancelSource, orderCategory, orderType, state, ...updateable } = update;
    const request = hexify(clientOrderId!, 6);
    const instrument = await Instrument.Key({ symbol: instId });
    const order: Partial<IOrder> = { request, order_id: parseInt(orderId!), instrument };

    //-- reference
    order.cancel_source = cancelSource ? await Reference.Key<Uint8Array>("cancel_source", { source_ref: cancelSource }) : undefined;
    order.order_state = state ? await Reference.Key<Uint8Array>("order_state", { source_ref: state }) : undefined;
    order.request_type = orderType ? await Reference.Key<Uint8Array>("request_type", { source_ref: orderType }) : undefined;
    order.order_category = orderCategory ? await Reference.Key<Uint8Array>("order_category", { source_ref: orderCategory }) : undefined;
    order.instrument_type = updateable.instType ? await InstrumentType.Key({ source_ref: updateable.instType }) : undefined;

    //-- text
    order.broker_id = updateable.brokerId ? updateable.brokerId : undefined;
    order.margin_mode = updateable.marginMode ? updateable.marginMode : undefined;
    order.position = updateable.positionSide ? updateable.positionSide : undefined;
    order.action = updateable.side ? updateable.side : undefined;

    //-- number
    order.leverage = updateable.leverage ? parseInt(updateable.leverage) : undefined;
    order.size = updateable.size ? parseInt(updateable.size) : undefined;
    order.create_time = updateable.createTime ? parseInt(updateable.createTime) : undefined;
    order.update_time = updateable.updateTime ? parseInt(updateable.updateTime) : undefined;

    //-- float
    order.average_price = updateable.averagePrice ? parseFloat(updateable.averagePrice) : undefined;
    order.fee = updateable.fee ? parseFloat(updateable.fee) : undefined;
    //order.filled_amount = updateable.filled_amount ? parseFloat(updateable.filled_amount) : undefined;
    order.filled_amount = updateable.filledAmount ? parseFloat(updateable.filledAmount) : undefined;
    order.filled_size = updateable.filledSize ? parseFloat(updateable.filledSize) : undefined;
    order.pnl = updateable.pnl ? parseFloat(updateable.pnl) : undefined;
    order.price = updateable.price ? parseFloat(updateable.price) : undefined;

    //-- boolean
    order.reduce_only = updateable.reduceOnly ? updateable.reduceOnly === "true" : undefined;

    await Orders.Update(order);
  }
};

//+--------------------------------------------------------------------------------------+
//| Scrubs orders on api/wss-timer, sets status, merges corrections/updates locally;     |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  const history = await History();
  const pending = await Pending();

  const missing: Array<Partial<IOrderAPI>> = [];
  const changed: Array<Partial<IOrderAPI>> = [];
  const cancels: Array<Partial<IOrderAPI>> = [];

  for (const order of history!) {
    const { request, client_order_id, found } = await Key(order);
    Object.assign(order, { ...order, clientOrderId: client_order_id });

    if (found) {
      const [compare, results] = await Compare(order, request!);
      compare && compare === "modify" && changed.push(results);
    } else {
      missing.push(order);
    }
  }

  for (const order of pending!) {
    const { request, client_order_id, found } = await Key(order);
    Object.assign(order, { ...order, clientOrderId: client_order_id });

    if (found) {
      const [compare, results] = await Compare(order, request!);
      compare && compare === "modify" && changed.push(results);
    } else {
      missing.push(order);
    }
  }

  console.log("Orders Imported: ", missing.length, missing);
  console.log("Orders Updated: ", changed.length, changed);

  await Publish(missing);
  await Update(changed);
};
