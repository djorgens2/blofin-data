//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { TRequest } from "@db/interfaces/state";

import { Session, signRequest } from "@module/session";

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

//+--------------------------------------------------------------------------------------+
//| Submit queued status requests for entry/opening at broker;                           |
//+--------------------------------------------------------------------------------------+
export const Submit = async (requests: Array<Partial<IRequestAPI>>) => {
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
      console.log(error, method, headers, body);
      return [];
    }
  }
};
