//+--------------------------------------------------------------------------------------+
//|                                                                     [api]  orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IRequestAPI } from "@api/requests";
import type { IOrder } from "@db/interfaces/order";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { bufferString, fileWrite, isEqual } from "@lib/std.util";

import * as Orders from "@db/interfaces/order";
import * as Request from "@db/interfaces/request";
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
//| Processes WSS/API orders; returns modified/full data for update/insert locally;      |
//+--------------------------------------------------------------------------------------+
const compare = async (api: Partial<IOrder>, request: IOrder["request"]): Promise<[TCompare, Partial<IOrder>]> => {
  const [order] = await Orders.Fetch({ request });
  const change: Partial<IOrder> = { request, instrument: api.instrument, position: api.position, create_time: api.create_time, update_time: api.update_time };
  const changeThreshold = Object.keys(change).length;

  if (order) {
    if (order.update_time! > api.update_time!)
      return ["reject", { request, memo: `Request ${bufferString(request)} rejected; latest update already applied;` }];

    if (!isEqual(order.instrument!, api.instrument!))
      return ["reject", { request, memo: `Request ${bufferString(request)} rejected; symbol/instrument mismatch;` }];

    if (order.position !== api.position)
      //--- Unauthorized Instrument position change
      return ["reject", { request, memo: `Request ${bufferString(request)} rejected; unpermitted order position change;` }];

    api.action && order.action !== api.action && (change.action = api.action);
    api.margin_mode && order.margin_mode !== api.margin_mode! && (change.margin_mode = api.margin_mode);
    api.broker_id && order.broker_id !== api.broker_id! && (change.broker_id = api.broker_id);

    api.orderId && !isEqual(order.order_id!, api.order_id!) && (change.order_id = api.order_id);
    api.order_category && !isEqual(order.order_category!, api.order_category!) && (change.order_category = api.order_category);
    api.order_state && !isEqual(order.order_state!, api.order_state!) && (change.order_state = api.order_state);
    api.order_type && !isEqual(order.order_type!, api.order_type!) && (change.request_type = api.request_type);
    api.cancel_source && !isEqual(order.canceled_by!, api.cancel_source!) && (change.cancel_source = api.cancel_source);
    api.price && !isEqual(order.price!, api.price) && (change.price = api.price);
    api.size && !isEqual(order.size!, api.size) && (change.size = api.size);
    api.leverage && !isEqual(order.leverage!, api.leverage) && (change.leverage = api.leverage);
    api.filled_size && !isEqual(order.filled_size!, api.filled_size) && (change.filled_size = api.filled_size);
    api.filled_amount && !isEqual(order.filled_amount!, api.filled_amount) && (change.filled_amount = api.filled_amount);
    api.average_price && !isEqual(order.average_price!, api.average_price) && (change.average_price = api.average_price);
    api.fee && !isEqual(order.fee!, api.fee) && (change.fee = api.fee);
    api.pnl && !isEqual(order.pnl!, api.pnl) && (change.pnl = api.pnl);

    order.reduce_only !== api.reduce_only && (change.reduce_only = api.reduce_only);

    if (Object.keys(change).length > changeThreshold)
      //--- change detected on non-mandatory field value change
      return ["modify", change];

    return ["accept", { request, memo: `Request ${bufferString(request)} accepted; latest update already applied;` }];
  } else {
    //--- missing
    return ["missing", change];
  }
};

//+--------------------------------------------------------------------------------------+
//| Returns formatted & keyed order object; includes full API props, pre & post values;  |
//+--------------------------------------------------------------------------------------+
const formatOrder = async (order: Partial<IOrderAPI>): Promise<Partial<IOrder>> => {
  const instrument = await Instrument.Key({ symbol: order.instId });
  const cancel_default = await Reference.Key<Uint8Array>("cancel_source", { source_ref: "not_canceled" });
  const cancel_source = await Reference.Key<Uint8Array>("cancel_source", { source_ref: order.cancelSource });
  const order_state = await Reference.Key<Uint8Array>("order_state", { source_ref: order.state });
  const request_type = await Reference.Key<Uint8Array>("request_type", { source_ref: order.orderType });
  const order_category = await Reference.Key<Uint8Array>("order_category", { source_ref: order.orderCategory });
  return {
    request: hexify(order.clientOrderId || parseInt(order.orderId!).toString(16), 6),
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
    create_time: order.createTime ? new Date(parseInt(order.createTime)) : Date.now(),
    update_time: order.updateTime ? new Date(parseInt(order.updateTime)) : Date.now(),
  };
};

let captureReject: Array<Partial<IOrder>> = [];
//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export const Publish = async (source: string, orders: Array<Partial<IOrderAPI>>) => {
  console.log(`In ${source}.Publish [API]`);

  const modified: Array<Partial<IOrder>> = [];
  const missing: Array<Partial<IOrder>> = [];
  const resubmit: Array<Partial<IOrder>> = [];
  const rejected: Array<Partial<IOrder>> = [];

  if (orders.length) {
    for (const order of orders) {
      const update = await formatOrder(order);

      if (update.instrument) {
        const request = await Request.Key({ request: update.request });

        //-- handle missing requests
        if (request) {
          const [result, changed] = await compare(update, request);
          result === "modify" && modified.push({ ...changed, memo: `Order ${bufferString(update.request!)} updated remotely; request updated;` });
          result === "missing" && missing.push(update);
          result === "reject" && rejected.push(changed);
        } else {
          const index = resubmit.findIndex((resub) => isEqual(resub.request!, update.request!));
          if (index < 0) {
            resubmit.push({ ...update, memo: `Request ${bufferString(update.request!)} missing locally; imported and resubmitted;` });
          } else if (resubmit[index].create_time! < update.create_time!) {
            console.log(`Request ${update.request} replaced; latest update applied;`);
            Object.assign(resubmit[index], { ...update, memo: `Request ${bufferString(update.request!)} replaced; latest update applied;` });
          } else {
            rejected.push({ ...update, memo: `Request ${bufferString(update.request!)} rejected; latest update already applied;` });
          }
        }
      } else rejected.push({ ...update, memo: `Request [${update.order_id!}:${update.symbol!}] rejected; invalid symbol/instrument;` });
    }

    if (resubmit.length) {
      console.log(`In Process.Resubmit [${resubmit.length}]`);
      for (const order of resubmit) {
        const state = await Orders.State({ order_state: order.order_state });
        await Request.Submit({ ...order, state });
        await Orders.Publish(order);
      }
    }

    if (missing.length) {
      console.log(`In Process.Missing [${missing.length}]`);
      for (const order of missing) await Orders.Publish(order);
    }

    if (modified.length) {
      console.log(`In Process.Modified [${modified.length}]`);
      for (const order of modified) {
        await Request.Submit(order);
        await Orders.Update(order);
      }
    }

    missing.length && console.log("Orders Recieved:", missing.length, "missing");
    modified.length && console.log("Orders Updated:", modified.length, "modified");
    rejected.length && console.log("Orders Rejected:", rejected.length, "rejected");
    rejected && rejected.length && (captureReject = [...rejected, ...captureReject]);
  }
};

//+--------------------------------------------------------------------------------------+
//| Scheduled process retrieves active orders; reconciles with local db; Executes queued;|
//+--------------------------------------------------------------------------------------+
const Pending = async (): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log(`In Fetch:Pending [API]`);
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
const History = async (props: { limit?: number; before?: string; after?: string }): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log(`In Fetch:History [API]`);
  const { limit, before, after } = props;
  const method = "GET";
  const path = `/api/v1/trade/orders-history${limit ? `?limit=`.concat(limit.toString()) : ``}${after ? `?after=`.concat(after) : ``}${
    before ? `?before=`.concat(before) : ``
  }`;
  console.error(path);
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

let before = "0";
let after = "0";
let capture: Array<Partial<IOrderAPI>> = [];

//+--------------------------------------------------------------------------------------+
//| Scrubs orders on api/wss-timer, sets status, merges corrections/updates locally;     |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Orders.Import [API]");
  const output: Array<string> = [];
  const lastOrderId = before;
  const history = await History({ before });
  const pending = await Pending();

  history && history.length && (before = history[0].orderId!);
  history && history.length && (after = history.at(-1)!.orderId!);
  history && history.length && (await Publish("History", history));
  pending && pending.length && (await Publish("Pending", pending));

  history && history.length && (capture = [...history, ...capture]);

  //-- last of history received
  if (lastOrderId === before) {
    if (capture.length) {
      for (const order of capture) {
        const request = bufferString(hexify(order.clientOrderId || parseInt(order.orderId!).toString(16), 6)!).concat(",") || "*";
        output.push(request.concat(Object.values(order).join(",")));
      }
      fileWrite("./app-history.log", output);
    }
    if (captureReject.length) {
      output.length = 0;
      for (const reject of captureReject) {
        try {
        const formatted = {
          request: bufferString(reject.request!),
          order_id: reject.order_id?.toString(),
          instrument: bufferString(reject.instrument!),
          price: reject.price!.toFixed(12),
          size: reject.size!.toFixed(12),
          request_type: bufferString(reject.request_type!),
          action: reject.action!,
          position: reject.position!,
          margin_mode: reject.margin_mode!,
          filled_size: reject.filled_size! ? reject.filled_size!.toFixed(12) : 0,
          filled_amount: reject.filled_amount ? reject.filled_amount!.toFixed(12) : 0,
          average_price: reject.average_price ? reject.average_price!.toFixed(12) : 0,
          order_state: bufferString(reject.order_state!),
          leverage: reject.leverage!.toString(),
          fee: reject.fee ? reject.fee!.toFixed(12) : 0,
          pnl: reject.pnl ? reject.pnl!.toFixed(12) : 0,
          order_category: bufferString(reject.order_category!),
          cancel_source: bufferString(reject.cancel_source!),
          reduce_only: reject.reduce_only! ? "true" : "false",
          broker_id: reject.broker_id ? reject.broker_id : ``,
          create_time: `"${reject.create_time!.toLocaleString()}"`,
          update_time: `"${reject.update_time!.toLocaleString()}"`,
          memo: reject.memo!,
        };
        output.push(Object.values(formatted).join(","));
      } catch (e) {
        console.log({error: e, reject})
      }
      }
      fileWrite("./reject-history.log", output);
    }
    // setTimeout(() => {
    //   process.exit(0);
    // }, 5000);
  }
};
