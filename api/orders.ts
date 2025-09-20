//+--------------------------------------------------------------------------------------+
//|                                                                     [api]  orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IRequestAPI } from "@api/requests";
import type { IOrder } from "@db/interfaces/order";

import { Session, signRequest } from "@module/session";
import { bufferString, isEqual } from "@lib/std.util";
import { hexify } from "@lib/crypto.util";
import { DB_SCHEMA, Select } from "@db/query.utils";

import * as Response from "@api/response";
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
const compare = async (api: Partial<IOrder>, order: Partial<IOrder>): Promise<[TCompare, Partial<IOrder>]> => {
  const request = order.request!;
  const change: Partial<IOrder> = {
    request,
    instrument: api.instrument,
    position: api.position,
    create_time: api.create_time,
    update_time: api.update_time,
  };
  const changeThreshold = Object.keys(change).length;

  if (order) {
    if (order.update_time! > api.update_time!)
      return ["reject", { request, memo: `[COMP] Request ${bufferString(request)} rejected; latest update already applied;` }];

    if (!isEqual(order.instrument!, api.instrument!))
      return ["reject", { request, memo: `[COMP] Request ${bufferString(request)} rejected; symbol/instrument mismatch;` }];

    if (order.position !== api.position)
      //--- Unauthorized Instrument position change
      return ["reject", { request, memo: `[COMP] Request ${bufferString(request)} rejected; unpermitted order position change;` }];

    api.action && order.action !== api.action && (change.action = api.action);
    api.margin_mode && order.margin_mode !== api.margin_mode! && (change.margin_mode = api.margin_mode);
    api.broker_id && order.broker_id !== api.broker_id! && (change.broker_id = api.broker_id);

    api.orderId && !isEqual(order.order_id!, api.order_id!) && (change.order_id = api.order_id);
    api.order_category && !isEqual(order.order_category!, api.order_category) && (change.order_category = api.order_category);
    api.order_state && !isEqual(order.order_state!, api.order_state) && (change.order_state = api.order_state);
    api.order_type && !isEqual(order.order_type!, api.order_type) && (change.request_type = api.request_type);
    api.cancel_source && !isEqual(order.cancel_source!, api.cancel_source) && (change.cancel_source = api.cancel_source);
    api.price && !isEqual(order.price!, api.price) && (change.price = api.price);
    api.size && !isEqual(order.size!, api.size) && (change.size = api.size);
    api.leverage && !isEqual(order.leverage!, api.leverage) && (change.leverage = api.leverage);
    api.filled_size && !isEqual(order.filled_size!, api.filled_size) && (change.filled_size = api.filled_size);
    api.filled_amount && !isEqual(order.filled_amount!, api.filled_amount) && (change.filled_amount = api.filled_amount);
    api.average_price && !isEqual(order.average_price!, api.average_price) && (change.average_price = api.average_price);
    api.fee && !isEqual(order.fee!, api.fee) && (change.fee = api.fee);
    api.pnl && !isEqual(order.pnl!, api.pnl) && (change.pnl = api.pnl);

    !!order.reduce_only !== !!api.reduce_only && (change.reduce_only = api.reduce_only);

    if (Object.keys(change).length > changeThreshold)
      //--- change detected on non-mandatory field value change
      return ["modify", change];

    return ["accept", { request, memo: `[COMP] Request ${bufferString(request)} accepted; latest update already applied;` }];
  } else {
    //--- missing
    return ["missing", { ...change, memo: `[COMP] Request ${bufferString(request)} missing locally; imported and resubmitted;` }];
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
    position: order.positionSide,
    action: order.side,
    margin_mode: order.marginMode,
    filled_size: parseFloat(order.filledSize!),
    filled_amount: order.filledAmount ? parseFloat(order.filledAmount) : order.filled_amount ? parseFloat(order.filled_amount) : undefined,
    average_price: parseFloat(order.averagePrice!),
    order_state,
    leverage: parseInt(order.leverage!),
    fee: parseFloat(order.fee!),
    pnl: parseFloat(order.pnl!),
    cancel_source: cancel_source ? cancel_source : cancel_default,
    order_category: order_category!,
    reduce_only: order.reduceOnly === "true",
    broker_id: order.brokerId?.length ? order.brokerId : undefined,
    create_time: order.createTime ? new Date(parseInt(order.createTime)) : Date.now(),
    update_time: order.updateTime ? new Date(parseInt(order.updateTime)) : Date.now(),
  };
};

//+--------------------------------------------------------------------------------------+
//| Returns the oldest orderId to fetch from api as the point to begin reconciliation;   |
//+--------------------------------------------------------------------------------------+
const startOrderId = async () => {
  const sql =
    `SELECT MIN(ord.start_order_id) AS start_order_id FROM (` +
    ` SELECT MIN(order_id) AS start_order_id FROM ${DB_SCHEMA}.orders WHERE create_time = update_time` +
    ` UNION SELECT MAX(order_id) start_order_id FROM ${DB_SCHEMA}.orders ) ord`;

  try {
    const [{ start_order_id }] = await Select<{ start_order_id: number }>(sql, []);
    return start_order_id ? start_order_id.toString() : "0";
  } catch (e) {
    console.log(sql, e);
    return "0";
  }
};

//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export const Publish = async (source: string, orders: Array<Partial<IOrderAPI>>) => {
  console.log(`-> ${source}.Publish [API]`);

  const modified: Array<Partial<IOrder>> = [];
  const missing: Array<Partial<IOrder>> = [];
  const resubmit: Array<Partial<IOrder>> = [];
  const rejected: Array<Partial<IOrder>> = [];

  if (orders.length) {
    for (const incoming of orders) {
      const order = await formatOrder(incoming);
      const request = order.request;

      if (order.instrument) {
        const [exists] = await Orders.Fetch({ request });

        //-- handle request changes
        if (exists) {
          if (exists.request_status === "Queued") {
            missing.push({ ...order });
          } else {
            const [result, changed] = await compare(order, exists);
            result === "modify" && modified.push(changed);
            result === "missing" && missing.push({...changed, memo: `[PUB] Queued Request missing and reprocessed; check db for possible duplicates;`});
            result === "reject" && rejected.push(changed);
          }
        } else {
          //-- handle missing requests
          const index = resubmit.findIndex((resub) => isEqual(resub.request!, request!));

          if (index < 0) {
            const [order_state] = await Reference.Fetch("order_state", { order_state: order.order_state });
            resubmit.push({ ...order, request_status: order_state!.map_ref, memo: `[PUB] Request missing locally; imported and resubmitted;` });
          } else if (resubmit[index].create_time! < order.create_time!) {
            Object.assign(resubmit[index], { ...order, memo: `[PUB] Request replaced; latest update applied;` });
          } else {
            rejected.push({ ...order, memo: `[PUB] Request rejected; latest update already applied;` });
          }
        }
      } else rejected.push({ ...order, memo: `[PUB] Request [${order.order_id!}:${order.symbol!}] rejected; invalid symbol/instrument;` });
    }

    if (resubmit.length) {
      console.log(`-> Process.Resubmit [${resubmit.length}]`);
      for (const order of resubmit) {
        await Request.Submit(order);
        await Orders.Publish(order);
      }
    }

    if (missing.length) {
      console.log(`-> Process.Missing [${missing.length}]`);
      for (const order of missing) await Orders.Publish(order);
    }

    if (modified.length) {
      console.log(`-> Process.Modified [${modified.length}]`);
      for (const order of modified) {
        const { memo, ...request } = order;
        await Request.Submit(request);
        await Orders.Update(order);
      }
    }

    missing.length && console.log("   # Orders Recieved:", missing.length, "imported");
    modified.length && console.log("   # Orders Updated:", modified.length, modified);
    rejected.length && console.log("   # Orders Rejected:", rejected.length, "rejected");
  }
};

//+--------------------------------------------------------------------------------------+
//| Scheduled process retrieves active orders; reconciles with local db; Executes queued;|
//+--------------------------------------------------------------------------------------+
const Pending = async (): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log(`-> Fetch:Pending [API]`);
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
  console.log(`-> Cancel [API]`);
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
      return await Response.Request({ results: json.data, success: "Closed", fail: "Canceled" });
    }
  } catch (error) {
    console.log(error, method, headers, body);
  }

  return [[], [], []];
};

//+--------------------------------------------------------------------------------------+
//| History - retrieves orders no longer active;                                         |
//+--------------------------------------------------------------------------------------+
const History = async (props: { limit?: number; before?: string; after?: string }): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log(`-> Fetch:History [API]`);
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

//+--------------------------------------------------------------------------------------+
//| Scrubs orders on api/wss-timer, sets status, merges corrections/updates locally;     |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Orders.Import [API]");

  const orderId = await startOrderId();
  const history = await History({ before: orderId });
  const pending = await Pending();

  history && history.length && (await Publish("History", history));
  pending && pending.length && (await Publish("Pending", pending));
};
