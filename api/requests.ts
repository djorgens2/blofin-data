//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { TRequest } from "@db/interfaces/state";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";

import * as Request from "@db/interfaces/request";

export interface IRequestAPI {
  status?: TRequest;
  orderId?: number | string | undefined | null;
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  side: "buy" | "sell";
  orderType: string;
  price: string;
  size: string;
  leverage: string;
  reduceOnly: string;
  clientOrderId: string;
  tpTriggerPrice: undefined | null;
  tpOrderPrice: undefined | null;
  slTriggerPrice: undefined | null;
  slOrderPrice: undefined | null;
  brokerId: string | undefined;
  createTime: string;
  updateTime: string;
}

export type TResponse = {
  orderId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

//+--------------------------------------------------------------------------------------+
//| Updates the request states via WSS or API;                                           |
//+--------------------------------------------------------------------------------------+
export async function Update(response: Array<TResponse>) {
  for (const result of response) {
    const { code, msg, orderId, clientOrderId } = result;
    const request = hexify(clientOrderId);
    const update = { request };

    code === "0"
      ? Object.assign(update, { ...update, status: "Pending", memo: `[${code}]: ${msg}; ${orderId}` })
      : Object.assign(update, { ...update, status: "Rejected", memo: `[${code}]: ${msg}` });
    request && (await Request.Update(update));
  }
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Submit(requests: Array<Partial<IRequestAPI>>) {
  if (requests.length > 0) {
    const method = "POST";
    const path = "/api/v1/trade/batch-orders";
    const body = JSON.stringify(requests);
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
        if (json.code === "0") {
          Update(json.data);
        } else {
          console.log(json, json.data, method, headers, body);
          throw new Error(json);
        }
      })
      .catch((error) => console.log(error));
  }
}
