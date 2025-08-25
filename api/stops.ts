//+--------------------------------------------------------------------------------------+
//|                                                                      [api]  stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IStopOrder } from "@db/interfaces/stops";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";

import * as Stops from "@db/interfaces/stops";

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

//+--------------------------------------------------------------------------------------+
//| Updates active stops from the blofin api;                                            |
//+--------------------------------------------------------------------------------------+
export async function Publish(active: Array<IStopsAPI>) {
  const stops = [];
  if (active.length) {
    for (const publish of active) {
      const update: Partial<IStopOrder> = {
        symbol: publish.instId,
        position: publish.positionSide,
        tpsl_id: parseInt(publish.tpslId),
        order_status: publish.state,
        action: publish.side,
        size: Number.isNaN(parseFloat(publish.size)) ? -1 : parseFloat(publish.size),
        actual_size: Number.isNaN(parseFloat(publish.actualSize)) ? -1 : parseFloat(publish.actualSize),
        reduce_only: publish.reduceOnly === "true" ? true : false,
        system_generated: publish.clientOrderId.length ? true : false,
        broker_id: publish.brokerId?.length ? publish.brokerId : undefined,
        create_time: parseInt(publish.createTime),
      };

      if (update.system_generated) {
        const order: Partial<IStopOrder> = {};
        const [client_order_id, stop_type] = publish.clientOrderId.split("-");
        Object.assign(order, { ...update, stop_request: hexify(client_order_id, 4), stop_type: stop_type as "tp" | "sl" });
        stops.push(order);
      } else {
        const stop_request = hexify(parseInt(publish.tpslId).toString(16), 4);
        const tp_trigger_price = parseFloat(publish.tpTriggerPrice);
        const tp_order_price = parseFloat(publish.tpOrderPrice);
        const sl_trigger_price = parseFloat(publish.slTriggerPrice);
        const sl_order_price = parseFloat(publish.slOrderPrice);

        if (!(Number.isNaN(tp_trigger_price) || Number.isNaN(tp_order_price))) {
          const tp: Partial<IStopOrder> = {
            ...update,
            stop_request,
            stop_type: "tp",
            trigger_price: tp_trigger_price ? tp_trigger_price : undefined,
            order_price: tp_order_price ? tp_order_price : -1,
          };
          stops.push(tp);
        }

        if (!(Number.isNaN(sl_trigger_price) || Number.isNaN(sl_order_price))) {
          const sl: Partial<IStopOrder> = {
            ...update,
            stop_request,
            stop_type: "sl",
            trigger_price: sl_trigger_price ? sl_trigger_price : undefined,
            order_price: sl_order_price ? sl_order_price : -1,
          };
          stops.push(sl);
        }
      }
    }

    const [missing, errors] = await Stops.Publish(stops);

    missing.length && console.log("Orders Published:", missing.length, missing);
    errors.length && console.log("Orders Errors:", errors.length, errors);
  }
}

//+--------------------------------------------------------------------------------------+
//| Active - retrieves active stops; reconciles with local db;                           |
//+--------------------------------------------------------------------------------------+
export async function Active() {
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
  const history = await Stops.Fetch({ order_status: "Pending" });
  const active: Array<IStopsAPI> = await Active();
  const closed: Array<Partial<IStopOrder>> = [];
  const pending: Array<Partial<IStopOrder>> = [];

  if (history.length)
    for (const local of history) {
      const { stop_request, stop_type, symbol, position } = local;

      let found = false;

      for (const activeStop of active) {
        const { instId, positionSide, side, tpTriggerPrice, tpOrderPrice, slTriggerPrice, slOrderPrice } = activeStop;
        const stopType =
          stop_type === "tp"
            ? !(Number.isNaN(tpTriggerPrice) || Number.isNaN(tpOrderPrice))
              ? "tp"
              : !(Number.isNaN(slTriggerPrice) || Number.isNaN(slOrderPrice))
            : "sl";

        if (instId === symbol && positionSide === position && stopType === stop_type) {
          found = true;
          break;
        }
      }

      found ? pending.push({ status: "Pending" }) : closed.push({ stop_request, stop_type, status: "Closed", memo: "Closed: Stop order no longer active" });
    }

  await Publish(active);
  await Stops.Update(closed);

  pending.length && console.log(`# Pending Stops: [${history.length}, ${pending.length}]`);
  closed.length && console.log(`# Stops Closed: [${closed.length}]`, closed);
};
