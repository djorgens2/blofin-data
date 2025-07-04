//+--------------------------------------------------------------------------------------+
//|                                                                             stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IStopRequest } from "@db/interfaces/stops";

import { hexify } from "@lib/crypto.util";
import { Session, signRequest } from "@module/session";

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
  for (const publish of props) {
    const update: Partial<IStopRequest> = {
      request: hexify(publish.clientOrderId),
      tpsl_id: publish.tpslId,
      state: publish.state,
      action: publish.side,
      size: parseFloat(publish.size),
      reduce_only: publish.reduceOnly === "true" ? true : false,
      broker_id: publish.brokerId?.length ? publish.brokerId : undefined,
      create_time: parseInt(publish.createTime),
      stops: [
        { stop_type: "tp", trigger_price: parseFloat(publish.tpTriggerPrice), order_price: parseFloat(publish.tpOrderPrice) },
        { stop_type: "sl", trigger_price: parseFloat(publish.slTriggerPrice), order_price: parseFloat(publish.slOrderPrice) },
      ],
    };

    if (publish.clientOrderId.length === 0) {
      await Cancel(publish);
      await Stops.Publish(update);
    }
    await Stops.Publish(update);
  }
}

//+--------------------------------------------------------------------------------------+
//| Import - retrieves active orders; reconciles with local db;                          |
//+--------------------------------------------------------------------------------------+
export async function Import() {
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
//| Cancel - closes a pending TP/SL order;                                               |
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
