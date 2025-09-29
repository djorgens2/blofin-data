//+--------------------------------------------------------------------------------------+
//|                                                                     [api]  orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRefKey } from "@db/interfaces/reference";
import type { IOrder } from "@db/interfaces/order";
import type { IRequestAPI } from "@api/requests";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { Select } from "@db/query.utils";

import * as Response from "@api/response";
import * as Requests from "@db/interfaces/request";
import * as Orders from "@db/interfaces/order";
import * as Reference from "@db/interfaces/reference";
import * as InstrumentPositions from "@db/interfaces/instrument_position";

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
  console.log(`-> ${source}.Publish [API]`);

  const rejected: Array<Partial<IOrder>> = [];
  const processed: Array<IOrder["request"]> = [];

  if (props)
    for (const order of props) {
      const instrument_position = await InstrumentPositions.Key({ account: Session().account, symbol: order.instId, position: order.positionSide });

      if (instrument_position === undefined)
        rejected.push({
          request: hexify(order.clientOrderId || parseInt(order.orderId!).toString(16), 6),
          symbol: order.instId,
          position: order.positionSide,
          memo: `>> [Error] Orders.Publish: Invalid instrument position; order rejected`,
        });
      else {
        const request_type = await Reference.Key<TRefKey>({ source_ref: order.orderType }, { table: `request_type` });
        const order_states = await Reference.Fetch({ source_ref: order.state }, { table: `vw_order_states` });

        const [{ state, order_state }] = order_states ? order_states : [{ state: undefined, order_state: undefined }];

        const request = await Requests.Submit({
          request: hexify(order.clientOrderId || parseInt(order.orderId!).toString(16), 6),
          instrument_position,
          action: order.side,
          state,
          price: parseFloat(order.price!),
          size: parseFloat(order.size!),
          leverage: parseInt(order.leverage!),
          request_type: request_type ? request_type : undefined,
          margin_mode: order.marginMode,
          reduce_only: order.reduceOnly === "true",
          broker_id: order.brokerId ? order.brokerId : undefined,
          create_time: new Date(parseInt(order.createTime!)),
          update_time: new Date(parseInt(order.updateTime!)),
        });

        if (request === undefined)
          rejected.push({
            request: hexify(order.clientOrderId || parseInt(order.orderId!).toString(16), 6),
            symbol: order.instId,
            position: order.positionSide,
            memo: `>> [Error] Orders.Publish: Request publication failed for order; order rejected`,
          });
        else {
          const cancel_default = await Reference.Key<TRefKey>({ source_ref: "not_canceled" }, { table: `cancel_source` });
          const cancel_source = await Reference.Key<TRefKey>({ source_ref: order.cancelSource }, { table: `cancel_source` });
          const order_category = await Reference.Key<TRefKey>({ source_ref: order.orderCategory }, { table: `order_category` });

          const result = await Orders.Publish({
            request,
            order_id: parseInt(order.orderId!),
            order_state,
            order_category: order_category!,
            cancel_source: cancel_source ? cancel_source : cancel_default,
            filled_size: parseFloat(order.filledSize!),
            filled_amount: order.filledAmount ? parseFloat(order.filledAmount) : order.filled_amount ? parseFloat(order.filled_amount) : undefined,
            average_price: parseFloat(order.averagePrice!),
            fee: parseFloat(order.fee!),
            pnl: parseFloat(order.pnl!),
            create_time: new Date(parseInt(order.createTime!)),
            update_time: new Date(parseInt(order.updateTime!)),
          });

          result
            ? processed.push(result)
            : rejected.push({
                request: hexify(order.clientOrderId || parseInt(order.orderId!).toString(16), 6),
                symbol: order.instId,
                position: order.positionSide,
                memo: `>> [Error: Orders.Publish] Order publication failed; order rejected`,
              });
        }
      }
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
      return await Response.Request(json.data, { success: "Closed", fail: "Canceled" });
    } else throw new Error(`Order.Cancel: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error] Order.Cancel:", error, method, headers, body);
    return undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| History - retrieves orders no longer active;                                         |
//+--------------------------------------------------------------------------------------+
const History = async (props: { limit?: number; before?: number; after?: number }): Promise<Array<Partial<IOrderAPI>> | undefined> => {
  console.log(`-> Fetch:History [API]`);

  const limit = props.limit ? `?limit=`.concat(props.limit.toString()) : ``;
  const before = props.before ? `?before=`.concat(props.before.toString()) : ``;
  const after = props.after ? `?after=`.concat(props.after.toString()) : ``;
  const method = "GET";
  const path = `/api/v1/trade/orders-history${limit}${before}${after}`;

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

  const result = await Select<IOrder>({ account: Session().account }, { table: `vw_account_orders` });

  if (result) {
    const [start] = result;
    const history = await History({ after: start.order_id });
    const pending = await Pending();

    history && history.length && (await Publish("History", history));
    pending && pending.length && (await Publish("Pending", pending));
  }
};
