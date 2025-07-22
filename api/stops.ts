//+--------------------------------------------------------------------------------------+
//|                                                                      [api]  stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IStopRequest } from "@db/interfaces/stops";

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
export async function Publish(props: Array<IStopsAPI>) {
  const stops = [];
  if (props.length) {
    for (const publish of props) {
      const update: Partial<IStopRequest> = {
        tpsl_id: publish.tpslId,
        order_state: publish.state,
        action: publish.side,
        size: Number.isNaN(parseFloat(publish.size)) ? -1 : parseFloat(publish.size),
        actual_size: Number.isNaN(parseFloat(publish.actualSize)) ? -1 : parseFloat(publish.actualSize),
        reduce_only: publish.reduceOnly === "true" ? true : false,
        broker_id: publish.brokerId?.length ? publish.brokerId : undefined,
        create_time: parseInt(publish.createTime),
      };

      if (publish.clientOrderId.length) {
        const req: Partial<IStopRequest> = {};
        const [client_order_id, stop_type] = publish.clientOrderId.split("-");
        Object.assign(req, { ...update, stop_request: hexify(client_order_id, 4), stop_type: stop_type as "tp" | "sl" });
        stops.push(req);
      } else {
        const stop_request = hexify(parseInt(publish.tpslId).toString(16), 4);
        const tp_trigger_price = parseFloat(publish.tpTriggerPrice);
        const tp_order_price = parseFloat(publish.tpOrderPrice);
        const sl_trigger_price = parseFloat(publish.slTriggerPrice);
        const sl_order_price = parseFloat(publish.slOrderPrice);

        if (!(Number.isNaN(tp_trigger_price) || Number.isNaN(tp_order_price))) {
          const tp: Partial<IStopRequest> = {};
          Object.assign(tp, {
            ...update,
            stop_request,
            stop_type: "tp",
            trigger_price: tp_trigger_price ? tp_trigger_price : null,
            order_price: tp_order_price ? tp_order_price : -1,
          });
          stops.push(tp);
        }

        if (!(Number.isNaN(sl_trigger_price) || Number.isNaN(sl_order_price))) {
          const sl: Partial<IStopRequest> = {};
          Object.assign(sl, {
            ...update,
            stop_request,
            stop_type: "sl",
            trigger_price: sl_trigger_price ? sl_trigger_price : null,
            order_price: sl_order_price ? sl_order_price : -1,
          });
          stops.push(sl);
        }
      }
    }
    await Stops.Publish(stops);
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

  fetch(rest_api_url!.concat(path), {
    method,
    headers,
  })
    .then((response) => response.json())
    .then((json) => {
      if (json?.code > 0) throw new Error(json);
      Publish(json.data);
    })
    .catch((error) => console.log(error));
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

  fetch(rest_api_url!.concat(path), {
    method,
    headers,
    body,
  })
    .then((response) => response.json())
    .then((json) => {
      if (json?.code > 0) {
        console.log(json);
        throw new Error(json.data);
      }
    })
    .catch((error) => console.log(error));
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
