//+--------------------------------------------------------------------------------------+
//|                                                                      [api]  stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStops, IStopOrder } from "db/interfaces/stops";
import type { TRefKey } from "db/interfaces/reference";
import type { TRequest } from "db/interfaces/state";

import { Session, setSession, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { format, isEqual } from "lib/std.util";

import * as Response from "api/response";
import * as Stops from "db/interfaces/stops";
import * as States from "db/interfaces/state";
import * as Reference from "db/interfaces/reference";
import * as InstrumentPositions from "db/interfaces/instrument_position";

export interface IStopsAPI {
  account: Uint8Array;
  status: TRequest;
  tpslId: string;
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  side: "buy" | "sell";
  orderCategory: string;
  priceType: string;
  tpTriggerPrice: string;
  tpOrderPrice: string;
  slTriggerPrice: string;
  slOrderPrice: string;
  size: string;
  state: string;
  leverage: string;
  reduceOnly: string;
  actualSize: string;
  clientOrderId: string;
  createTime: string;
  brokerId: string;
  memo: string;
  update_time: Date
}

//+--------------------------------------------------------------------------------------+
//| Updates active stops from the blofin api;                                            |
//+--------------------------------------------------------------------------------------+
const publish = async (source: string, props: Array<Partial<IStopsAPI>>) => {
  const processed: Array<IStopOrder["stop_request"]> = [];
  const published: Array<IStopOrder["stop_request"]> = [];
  const rejected: Array<Partial<IStops>> = [];

  props && console.log(`-> ${source}.Publish.Stops [API]`);

  for (const order of props) {
    const tp_id = order.tpTriggerPrice == null && order.tpOrderPrice == null ? undefined : hexify(parseInt(order.tpslId!), 4, `e4`);
    const sl_id = order.slTriggerPrice == null && order.slOrderPrice == null ? undefined : hexify(parseInt(order.tpslId!), 4, `df`);
    const tpsl_id = hexify(parseInt(order.tpslId!), 4);
    const client_order_id = hexify(order.clientOrderId!, 5);
    const instrument_position = await InstrumentPositions.Key({ account: Session().account, symbol: order.instId, position: order.positionSide });

    if (instrument_position === undefined) {
      const common = {
        tpsl_id,
        client_order_id,
        symbol: order.instId,
        position: order.positionSide,
        memo: `>> [Error] Stops.Publish: Invalid instrument position; stop order rejected`,
      };
      tp_id &&
        rejected.push({
          ...common,
          stop_order: tp_id,
          stop_type: "tp",
        });
      sl_id &&
        rejected.push({
          ...common,
          stop_order: sl_id,
          stop_type: "sl",
        });
    } else {
      const order_category = await Reference.Key<TRefKey>({ source_ref: order.orderCategory || "normal" }, { table: `order_category` });
      const order_states = await Reference.Fetch({ source_ref: order.state }, { table: `vw_order_states` });
      const expired = await States.Key({ status: "Expired" });
      const [{ state, order_state }] = order_states ? order_states : [{ state: undefined, order_state: undefined }];

      const common: Partial<IStopOrder> = {
        tpsl_id,
        client_order_id,
        instrument_position,
        state: source === "History" && (order.state === "effective" || order.state === "live") ? expired : state,
        order_state,
        order_category,
        price_type: order.priceType,
        action: order.side,
        size: format(order.size!),
        actual_size: format(order.actualSize!),
        reduce_only: order.reduceOnly === "true",
        broker_id: order.brokerId === "" ? undefined : order.brokerId,
        create_time: new Date(parseInt(order.createTime!)),
        update_time: new Date(),
      };

      if (tp_id === undefined) continue;
      else {
        processed.push(tp_id);

        const request = await Stops.Submit({
          ...common,
          stop_request: client_order_id || tp_id,
          stop_order: tp_id,
          stop_type: "tp",
          trigger_price: order.tpTriggerPrice == null ? undefined : format(order.tpTriggerPrice),
          order_price: order.tpOrderPrice == null ? -1 : format(order.tpOrderPrice),
        });

        const result = await Stops.Publish({ ...common, stop_order: tp_id });
        result
          ? published.push(result)
          : rejected.push({
              ...common,
              stop_order: tp_id,
              memo: `>> [Error] Stop.Orders.Publish: Error publishing stop order; stop order rejected; check log for details`,
            });
      }

      if (sl_id === undefined) continue;
      else {
        processed.push(sl_id);

        const request = await Stops.Submit({
          ...common,
          stop_request: client_order_id || sl_id,
          stop_order: sl_id,
          stop_type: "sl",
          trigger_price: order.slTriggerPrice == null ? undefined : format(order.slTriggerPrice),
          order_price: order.slOrderPrice == null ? -1 : format(order.slOrderPrice),
        });
        const result = await Stops.Publish({ ...common, stop_order: sl_id });
        result
          ? published.push(result)
          : rejected.push({
              ...common,
              stop_order: sl_id,
              memo: `>> [Error] Stop.Orders.Publish: Error publishing stop order; stop order rejected; check log for details`,
            });
      }
    }
  }
  return [published, rejected];
};

//+--------------------------------------------------------------------------------------+
//| History - retrieves active stops from history; reconciles/merges with local db;      |
//+--------------------------------------------------------------------------------------+
export async function History(): Promise<Array<Partial<IStopsAPI>> | undefined> {
  const method = "GET";
  const path = `/api/v1/trade/orders-tpsl-history?before=${Session().audit_stops}`;
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
}

//+--------------------------------------------------------------------------------------+
//| Active - retrieves active stops; reconciles with local db;                           |
//+--------------------------------------------------------------------------------------+
export async function Pending(): Promise<Array<Partial<IStopsAPI>> | undefined> {
  const method = "GET";
  const path = "/api/v1/trade/orders-tpsl-pending";
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
}

//+--------------------------------------------------------------------------------------+
//| Cancel - closes a pending TP/SL order;                                               |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (cancels: Array<Partial<IStopsAPI>>) => {
  const method = "POST";
  const path = "/api/v1/trade/cancel-tpsl";
  const body = JSON.stringify(cancels);

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
//| Submit - submits a pending TP/SL order;                                              |
//+--------------------------------------------------------------------------------------+
export const Submit = async (request: Partial<IStopsAPI>) => {
  const method = "POST";
  const path = "/api/v1/trade/order-tpsl";
  const body = JSON.stringify(request);
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
      return await Response.Stops(json.data, { success: "Pending", fail: "Rejected" });
    }
  } catch (error) {
    console.log(error);
  }
};

//+--------------------------------------------------------------------------------------+
//| Scrubs positions on api/wss-timer, sets status, reconciles history, updates locally; |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  const history = await History();
  const pending = await Pending();

  if (history && history.length) {
    const [published, rejected] = await publish("History", history);

    setSession({ audit_stops: history[0].tpslId! });

    published && published.length && console.log(`   # History Stop Orders Processed [${history.length + rejected.length}]:  ${published.length} published`);
    rejected && rejected.length && console.log(`   # History Stop Orders Rejected: `, rejected.length);
  }

  if (pending && pending.length) {
    const [published, rejected] = await publish("Pending", pending);

    published && published.length && console.log(`   # Pending Stop Orders Processed [${pending.length}]:  ${published.length} published`);
    rejected && rejected.length && console.log("   # Pending Stop Orders Rejected: ", rejected.length);
  }
};
