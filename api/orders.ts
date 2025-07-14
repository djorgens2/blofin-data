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
type TCompare = "reject" | "accept" | "modify" | "missing";

//+--------------------------------------------------------------------------------------+
//| Processes WSS/API returns set of modified columns for update/insert locally     |
//+--------------------------------------------------------------------------------------+
const Compare = async (api: Partial<IOrderAPI>, request: IOrder["request"]): Promise<[TCompare, Partial<IOrder>]> => {
  const [order] = await Orders.Fetch({ request, order_id: parseInt(api.orderId!) });
  const change: Partial<IOrder> = { request, order_id: parseInt(api.orderId!) };

  if (order) {
    if (order.order_id === parseInt(api.orderId!)) {
      if (order.symbol === api.instId) {
        //-- reference
        const cancel_source = api.cancelSource ? await Reference.Key<Uint8Array>("cancel_source", { source_ref: api.cancelSource }) : undefined;
        const order_state = api.state ? await Reference.Key<Uint8Array>("order_state", { source_ref: api.state }) : undefined;
        const request_type = api.orderType ? await Reference.Key<Uint8Array>("request_type", { source_ref: api.orderType }) : undefined;
        const order_category = api.orderCategory ? await Reference.Key<Uint8Array>("order_category", { source_ref: api.orderCategory }) : undefined;

        api.instType && order.position !== api.positionSide! && (change.position = api.positionSide);
        api.positionSide && order.position !== api.positionSide! && (change.position = api.positionSide);
        api.side && order.action !== api.side! && (change.action = api.side);
        api.marginMode && order.margin_mode !== api.marginMode! && (change.margin_mode = api.marginMode);
        api.orderCategory && order.category !== api.orderCategory! && (change.order_category = order_category);
        api.state && order.order_status !== api.state! && (change.order_state = order_state);
        api.orderType && order.order_type !== api.orderType! && (change.request_type = request_type);
        api.cancelSource && order.canceled_by !== api.cancelSource! && (change.cancel_source = cancel_source);
        api.brokerId && order.broker_id !== api.brokerId! && (change.broker_id = api.brokerId);

        api.price && !isEqual(order.price!, api.price) && (change.price = parseFloat(api.price));
        api.size && !isEqual(order.size!, api.size) && (change.size = parseFloat(api.size));
        api.leverage && !isEqual(order.leverage!, api.leverage) && (change.leverage = parseInt(api.leverage));
        api.filledSize && !isEqual(order.filled_size!, api.filledSize) && (change.filled_size = parseFloat(api.filledSize));
        api.filledAmount && !isEqual(order.filled_amount!, api.filledAmount) && (change.filled_amount = parseFloat(api.filledAmount));
        api.averagePrice && !isEqual(order.average_price!, api.averagePrice) && (change.average_price = parseFloat(api.averagePrice));
        api.fee && !isEqual(order.fee!, api.fee) && (change.fee = parseFloat(api.fee));
        api.pnl && !isEqual(order.pnl!, api.pnl) && (change.pnl = parseFloat(api.pnl));

        !isEqual(Math.trunc(new Date(order.create_time!).getTime() / 1000), parseInt(api.createTime!) / 1000, 0) &&
          (change.create_time = parseInt(api.createTime!));
        !isEqual(Math.trunc(new Date(order.update_time!).getTime() / 1000), parseInt(api.updateTime!) / 1000, 0) &&
          (change.update_time = parseInt(api.updateTime!));

        !!order.reduce_only! !== (api.reduceOnly! === "true") && (change.reduce_only = api.reduceOnly! === "true");

        if (Object.keys(change).length > 2) {
          return ["modify", change];
        }

        return ["accept", { orderId: api.orderId }];
      } else {
        return ["reject", { orderId: api.orderId }];
      }
    } else {
      return ["reject", { orderId: api.orderId }];
    }
  } else {
    //--- missing
    return ["missing", change];
  }
};

//+--------------------------------------------------------------------------------------+
//| Returns formatted and keyed order objects for comparison/publishing;                 |
//+--------------------------------------------------------------------------------------+
const formatOrder = async (order: Partial<IOrderAPI>): Promise<Partial<IOrder>> => {
  const instrument = await Instrument.Key({ symbol: order.instId });
  const cancel_default = await Reference.Key<Uint8Array>("cancel_source", { source_ref: "not_canceled" });
  const cancel_source = await Reference.Key<Uint8Array>("cancel_source", { source_ref: order.cancelSource });
  const order_state = await Reference.Key<Uint8Array>("order_state", { source_ref: order.state });
  const request_type = await Reference.Key<Uint8Array>("request_type", { source_ref: order.orderType });
  const order_category = await Reference.Key<Uint8Array>("order_category", { source_ref: order.orderCategory });
  return {
    request: order.clientOrderId ? hexify(order.clientOrderId!, 6) : hexify(parseInt(order.orderId!).toString(16), 6),
    order_id: parseInt(order.orderId!),
    instrument,
    price: parseFloat(order.price!),
    size: parseFloat(order.size!),
    request_type,
    action: order.side,
    position: order.positionSide,
    margin_mode: order.marginMode,
    filled_size: parseFloat(order.filledSize!),
    filled_amount: order.filledAmount ? parseFloat(order.filledAmount) : order.filled_amount ? parseFloat(order.filled_amount) : undefined,
    average_price: parseFloat(order.averagePrice!),
    order_state,
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
};

//+--------------------------------------------------------------------------------------+
//| Returns formatted request object for replacement/missing/console entered requests;   |
//+--------------------------------------------------------------------------------------+
const formatRequest = async (order: Partial<IOrder>): Promise<Partial<IRequest>> => {
  const state = await Orders.State({ order_state: order.order_state });
  return {
    request: order.request,
    state,
    instrument: order.instrument,
    position: order.position,
    action: order.action,
    price: order.price,
    size: order.size,
    leverage: order.leverage,
    request_type: order.request_type,
    margin_mode: order.margin_mode,
    reduce_only: order.reduce_only,
    memo: `Request missing; imported locally;`,
    expiry_time: setExpiry("1h"), //--- need a default expiry mechanism
  };
};

//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export const Publish = async (source: string, orders: Array<Partial<IOrderAPI>>) => {
  console.log(`In ${source}.Publish [API]`);

  const modified = [];
  const missing = [];

  if (orders) {
    for (const order of orders) {
      const update = await formatOrder(order);

      if (update.instrument) {
        const request = await Request.Key({ request: update.request });

        //-- handle missing requests
        if (request) {
          const [compare, results] = await Compare(order, request);
          compare === "modify" && modified.push(results);
          compare === "missing" && missing.push(update);
        } else {
          const request = await formatRequest(update);
          await Request.Submit(request);
          missing.push(update);
        }
      } else {
        console.log(`Error: Bad/Missing Symbol [${order.instId}]`);
      }
    }

    if (missing.length) {
      for (const order of missing) await Orders.Publish(order);
    }
    if (modified.length) {
      for (const order of modified) await Orders.Update(order);
    }

    missing.length && console.log("Orders Imported:", missing.length, missing);
    modified.length && console.log("Orders Updated:", modified.length, modified);
  }
};

//+--------------------------------------------------------------------------------------+
//| Scheduled process retrieves active orders; reconciles with local db; Executes queued;|
//+--------------------------------------------------------------------------------------+
const Pending = async (): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log(`In Pending Fetch [API]`);
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
  const body = JSON.stringify(cancels.map(({ instId, orderId }) => ({ instId, orderId })));
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
  console.log(`In History Fetch [API]`);
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
export const Import = async () => {
  console.log("In Orders.Import [API]");

  const history = await History();
  const pending = await Pending();

  history!.length && await Publish("History",history!);
  pending!.length && await Publish("Pending",pending!);
};
