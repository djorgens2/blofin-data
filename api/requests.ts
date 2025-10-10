//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRequest } from "db/interfaces/state";

import { Session, signRequest } from "module/session";

import * as Response from "api/response";
import { rejects } from "node:assert";

export interface IRequestAPI {
  account: Uint8Array;
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
  memo: string;
  createTime: string;
  updateTime: string;
  expiry_time?: Date;
}

//+--------------------------------------------------------------------------------------+
//| Sets Leverage for a trading instrument; ** Non-op pending relo to instrument API;    |
//+--------------------------------------------------------------------------------------+
const setLeverage = async (props: Partial<IRequestAPI>) => {
  console.log("In Requests.Leverage [API]", props);

  const method = "POST";
  const path = "/api/v1/account/set-leverage";
  const body = JSON.stringify(props);
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
      console.log(">> [Info: Orders.Leverage] Leverage set:", json);
      await Response.Leverage({ results: json.data });
    } else throw new Error(`Order.Leverage: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error] Order.Leverage:", error, method, headers, body);
  }
};

//+--------------------------------------------------------------------------------------+
//| Submits supplied requests to broker API;                                             |
//+--------------------------------------------------------------------------------------+
export const Submit = async (requests: Array<Partial<IRequestAPI>>) => {
  if (requests.length > 0) {
    console.log("In Requests.Submit [API]");

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

    try {
      const response = await fetch(rest_api_url!.concat(path), {
        method,
        headers,
        body,
      });

      if (response.ok) {
        const json = await response.json();
        return await Response.Request(json.data, { success: "Pending", fail: "Rejected" });
      } else throw new Error(`Order.Submit: Response not ok: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(">> [Error] Order.Submit:", error, method, headers, body);
    }
  } else return []
};
