//+--------------------------------------------------------------------------------------+
//|                                                                          requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { hexString } from "@lib/std.util";

import * as Request from "@db/interfaces/request";

export interface IRequestAPI {
  status?: string;
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
  for (const id in response) {
    const { code, msg, orderId, clientOrderId } = response[id];
    const request = hexify(clientOrderId);
    const update = { request };

    code === "0"
      ? Object.assign(update, { ...update, status: "Pending", memo: `[${code}]: ${msg}; ${orderId}` })
      : Object.assign(update, { ...update, status: "Rejected", memo: `[${code}]: ${msg}` });
    request && (await Request.Update(update));
  }
  // console.log("Instruments Suspended: ", suspense.length, ssuspense);
  // console.log("Instruments Updated: ", modified.length, modified);
  // await Currency.Suspend(suspense);
  // await Instrument.Suspend(suspense);
  // await InstrumentDetail.Update(modified);
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

//+--------------------------------------------------------------------------------------+
//| Formats and emits order requests to broker for execution;                            |
//+--------------------------------------------------------------------------------------+
export async function Process(): Promise<number> {
  const requests = await Request.Queue({ status: "Queued" });
  const queue: Array<Partial<IRequestAPI>> = [];

  for (const id in requests) {
    const request = requests[id];
    const custKey = hexify(request.clientOrderId!);
    const api: Partial<IRequestAPI> = {
      instId: request.instId!,
      marginMode: request.marginMode!,
      positionSide: request.positionSide!,
      side: request.side!,
      orderType: request.orderType!,
      price: request.price!,
      size: request.size!,
      leverage: request.leverage!,
      reduceOnly: request.reduceOnly!,
      clientOrderId: hexString(custKey!, 3),
      brokerId: request.brokerId ? request.brokerId : undefined,
    };
    queue.push(api);
  }
  await Submit(queue);
  return requests.length;
}
