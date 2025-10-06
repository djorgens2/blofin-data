//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRequest } from "db/interfaces/state";

import { Session, signRequest } from "module/session";

import * as Response from "api/response";

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
//| Submit queued status requests for entry/opening at broker;                           |
//+--------------------------------------------------------------------------------------+
const submit = async (requests: Array<Partial<IRequestAPI>>) => {
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
        const result = await Response.Request( json.data, {success: "Pending", fail: "Rejected" });

        return result ? result : undefined;
      } else throw new Error(`Order.Submit: Response not ok: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(">> [Error] Order.Submit:", error, method, headers, body);
    }
  }
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Submit queued status requests for entry/opening at broker;                           |
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

export const Submit = async (requests: Array<Partial<IRequestAPI>>) => {

  requests.map(async (req) => {
    await setLeverage({ instId: req.instId, leverage: req.leverage, marginMode: req.marginMode, positionSide: req.positionSide });
  });

  submit(requests);
};
