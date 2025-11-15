//+--------------------------------------------------------------------------------------+
//|                                                                     [api]  orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRefKey } from "db/interfaces/reference";
import type { IOrder } from "db/interfaces/order";
import type { IRequestAPI } from "api/requests";

import { Session, setSession, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { format, hexString } from "lib/std.util";

import * as Response from "api/response";
import * as Requests from "db/interfaces/request";
import * as Orders from "db/interfaces/order";
import * as Reference from "db/interfaces/reference";
import * as InstrumentPositions from "db/interfaces/instrument_position";

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

//+--------------------------------------------------------------------------------------+
//| Format order object for database insertion;                                          |
//+--------------------------------------------------------------------------------------+
export const Publish = async (source: string, props: Array<Partial<IOrderAPI>>) => {
  props && console.log(`-> ${source}.Publish [API]`);

  const accepted: Array<IOrder["order_id"]> = [];
  const rejected: Array<Partial<IOrder>> = [];

  for (const order of props) {
    const order_id = hexify(parseInt(order.orderId!).toString(16), 6);

    if (order_id) {
      const instrument_position = await InstrumentPositions.Key({ account: Session().account, symbol: order.instId, position: order.positionSide });

      if (instrument_position === undefined)
        rejected.push({
          order_id,
          symbol: order.instId,
          position: order.positionSide,
          memo: `>> [Error] Orders.Publish: Invalid instrument position; order rejected`,
        });
      else {
        const cancel_source = await Reference.Key<TRefKey>({ source_ref: order.cancelSource || "not_canceled" }, { table: `cancel_source` });
        const order_category = await Reference.Key<TRefKey>({ source_ref: order.orderCategory || "normal" }, { table: `order_category` });
        const order_states = await Reference.Fetch({ source_ref: order.state || "accepted" }, { table: `vw_order_states` });
        const [{ state, order_state }] = order_states ? order_states : [{ state: undefined, order_state: undefined }];

        const result = await Orders.Publish({
          order_id,
          client_order_id: hexify(order.clientOrderId!,6),
          order_state,
          order_category,
          cancel_source,
          filled_size: format(order.filledSize!),
          filled_amount: order.filledAmount ? format(order.filledAmount) : format(order.filled_amount!) ? format(order.filled_amount!) : undefined,
          average_price: format(order.averagePrice!),
          fee: format(order.fee!),
          pnl: format(order.pnl!),
          create_time: new Date(parseInt(order.createTime!)),
          update_time: new Date(parseInt(order.updateTime!)),
        });

        if (result) {
          const request = hexify(order.clientOrderId || order_id, 6);
          const request_type = await Reference.Key<TRefKey>({ source_ref: order.orderType }, { table: `request_type` });
          const result = await Requests.Submit({
            request,
            order_id,
            instrument_position,
            action: order.side,
            state,
            price: format(order.price!),
            size: format(order.size!),
            leverage: format(order.leverage!),
            request_type: request_type ? request_type : undefined,
            margin_mode: order.marginMode,
            reduce_only: order.reduceOnly ? order.reduceOnly === "true" ? true : false : undefined,
            broker_id: order.brokerId ? order.brokerId : undefined,
            create_time: new Date(parseInt(order.createTime!)),
            update_time: new Date(parseInt(order.updateTime!)),
          });

          result
            ? accepted.push(order_id)
            : rejected.push({
                order_id,
                symbol: order.instId,
                position: order.positionSide,
                memo: `>> [Error] Orders.Publish: Request publication failed; request rejected; check log for details`,
              });
        } else {
          rejected.push({
            order_id,
            symbol: order.instId,
            position: order.positionSide,
            memo: `>> [Error] Orders.Publish: Request publication failed for order; order rejected`,
          });
          console.log(`>> [Error] Orders.Publish: ${hexString(result!,6)}<>${hexString(order_id,6)}`);
        }
      }
    }
  }
  return [accepted, rejected];
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
    } else throw new Error(`Order.Pending: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error] Order.Pending:", error, method, path, headers);
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
      return await Response.Request(json, { success: "Closed", fail: "Canceled" });
    } else throw new Error(`Order.Cancel: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error] Order.Cancel:", error, method, headers, body);
    return undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| History - retrieves orders no longer active;                                         |
//+--------------------------------------------------------------------------------------+
const History = async (): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log(`-> Fetch:History [API]`);

  const method = "GET";
  const path = `/api/v1/trade/orders-history?before=${Session().audit_order}`;

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
    } else throw new Error(`Order.History: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error] Order.History:", error, method, path, headers);
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

  if (history && history.length) {
    const [published, rejected] = await Publish("History", history);

    setSession({ audit_order: history[0].orderId! });

    published && published.length && console.log(`   # History Orders Processed [${history.length}]:  ${published.length} published`);
    rejected && rejected.length && console.log(`   # History Orders Rejected: `, rejected.length, rejected);
  }

  if (pending && pending.length) {
    const [published, rejected] = await Publish("Pending", pending);

    published && published.length && console.log(`   # Pending Orders Processed [${pending.length}]:  ${published.length} published`);
    rejected && rejected.length && console.log("   # Pending Orders Rejected: ", rejected.length);
  }
};
