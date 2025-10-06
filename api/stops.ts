//+--------------------------------------------------------------------------------------+
//|                                                                      [api]  stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStops, IStopOrder } from "db/interfaces/stops";

import { Session, setSession, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { isEqual } from "lib/std.util";
import { Select, Insert, Update } from "db/query.utils";

import * as Stops from "db/interfaces/stops";
import * as States from "db/interfaces/state";
import * as Reference from "db/interfaces/reference";
import * as InstrumentPositions from "db/interfaces/instrument_position";

export interface IStopsAPI {
  tpslId: string;
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  side: "buy" | "sell";
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
}

const [tp, sl] = [`e4`, `df`];

//+--------------------------------------------------------------------------------------+
//| Updates active stops from the blofin api;                                            |
//+--------------------------------------------------------------------------------------+
const publish = async (source: string, props: Array<Partial<IStopsAPI>>) => {
  const processed: Array<IStopOrder["stop_request"]> = []; //-- handles batched orders; permits only first entry (newest) for insert/update
  const published: Array<IStopOrder["stop_request"]> = [];
  const rejected: Array<Partial<IStops>> = [];

  if (props) {
    console.log(`-> ${source}.Publish.Stops [API]`);

    for (const order of props) {
      const instrument_position = await InstrumentPositions.Key({ account: Session().account, symbol: order.instId, position: order.positionSide });

      if (instrument_position === undefined)
        rejected.push({
          tpsl_id: parseInt(order.tpslId!),
          symbol: order.instId,
          position: order.positionSide,
          memo: `>> [Error] Stop.Orders.Publish: Invalid instrument position; stop order rejected`,
        });
      else {
        const order_states = await Reference.Fetch({ source_ref: order.state }, { table: `vw_order_states` });
        const expired = await States.Key({ status: "Expired" });
        const [{ state, order_state }] = order_states ? order_states : [{ state: undefined, order_state: undefined }];

        const common: Partial<IStopOrder> = {
          instrument_position,
          tpsl_id: parseInt(order.tpslId!),
          state: source === "History" && (order.state === "effective" || order.state === "live") ? expired : state,
          order_state,
          action: order.side,
          size: order.size == null ? undefined : parseFloat(order.size),
          actual_size: order.actualSize! == null ? undefined : parseFloat(order.actualSize),
          reduce_only: order.reduceOnly === "true",
          broker_id: order.brokerId === "" ? undefined : order.brokerId,
          create_time: new Date(parseInt(order.createTime!)),
        };

        if (order.tpTriggerPrice == null && order.tpOrderPrice == null) continue;
        else {
          const key = hexify(order.clientOrderId!, 4) || hexify(parseInt(order.tpslId!), 4, tp);
          const exists = processed.find((stop_request) => isEqual(stop_request, key!));
          if (exists) continue;
          else {
            const request = await Stops.Submit({
              ...common,
              stop_request: key,
              stop_type: "tp",
              trigger_price: order.tpTriggerPrice == null ? undefined : parseFloat(order.tpTriggerPrice),
              order_price: order.tpOrderPrice == null ? -1 : parseFloat(order.tpOrderPrice),
            });

            const result = await Stops.Publish({ stop_request: request, ...common });
            result
              ? published.push(result)
              : rejected.push({
                  ...common,
                  stop_request: request,
                  memo: `>> [Error] Stop.Orders.Publish: Error publishing stop order; stop order rejected; check log for details`,
                });
          }
        }

        if (order.slTriggerPrice == null && order.slOrderPrice == null) continue;
        else {
          const key = hexify(order.clientOrderId!, 4) || hexify(parseInt(order.tpslId!), 4, sl);
          const exists = processed.find((stop_request) => isEqual(stop_request, key!));
          if (exists) continue;
          else {
            const request = await Stops.Submit({
              ...common,
              stop_request: key,
              stop_type: "sl",
              trigger_price: order.slTriggerPrice == null ? undefined : parseFloat(order.slTriggerPrice),
              order_price: order.slOrderPrice == null ? -1 : parseFloat(order.slOrderPrice),
            });
            const result = await Stops.Publish({ stop_request: request, ...common });
            result
              ? published.push(result)
              : rejected.push({
                  ...common,
                  stop_request: request,
                  memo: `>> [Error] Stop.Orders.Publish: Error publishing stop order; stop order rejected; check log for details`,
                });
          }
        }
      }
    }
  }
  return [published, rejected];
};

//+--------------------------------------------------------------------------------------+
//| History - retrieves active stops from history; reconciles/merges with local db;      |
//+--------------------------------------------------------------------------------------+
export async function History() {
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
export async function Pending() {
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
export async function Cancel(cancel: Partial<IStopsAPI>) {
  const method = "POST";
  const path = "/api/v1/trade/cancel-tpsl";
  const body = `[${JSON.stringify((({ instId, tpslId, clientOrderId }) => ({ instId, tpslId, clientOrderId }))(cancel))}]`;

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
}

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
      return json.data;
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

    published && published.length && console.log(`   # History Stop Orders Processed [${history.length * 2}]:  ${published.length} published`);
    rejected && rejected.length && console.log(`   # History Stop Orders Rejected: `, rejected.length);
  }

  if (pending && pending.length) {
    const [published, rejected] = await publish("Pending", pending);

    published && published.length && console.log(`   # Pending Stop Orders Processed [${pending.length}]:  ${published.length} published`);
    rejected && rejected.length && console.log("   # Pending Stop Orders Rejected: ", rejected.length);
  }
};
