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
  orderId?: string;
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
//| Handles responses received from WSS/API or POST calls;                               |
//+--------------------------------------------------------------------------------------+
export const Request = async (response: TResponse, props: { success: TRequest; fail: TRequest }) => {
  const accept: Array<Partial<IResponse>> = [];
  const reject: Array<Partial<IResponse>> = [];

  if (Array.isArray(response.data)) {
    const success = await States.Key<IRequestState>({ status: props.success });
    const fail = await States.Key<IRequestState>({ status: props.fail });
    const responses = response.data as Array<Partial<IRequestAPI & TResult>>;

    for (const response of responses) {
      const request = {
        request: hexify(response.clientOrderId!, 6) || hexify(parseInt(response.orderId!), 6),
        order_id: hexify(parseInt(response.orderId!), 6),
        state: response.code === "0" ? success : fail,
        memo:
          response.code === "0"
            ? `[Info] Response.Request: Order ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Request: ${props.fail === "Rejected" ? `Order` : `Cancellation`} failed with code [${response.code}]: ${response.msg}`,
        update_time: new Date(),
      };
      const [result, updates] = await Update<Orders.IOrder>(request, { table: `request`, keys: [{ key: `request` }] });
      result ? accept.push({ ...request, code: parseInt(response.code!) }) : reject.push({ ...request, code: parseInt(response.code!) });
    }
    return [accept, reject];
  } else {
    console.log(
      `-> [Error] Response.Request: Request not processed; error returned:`,
      response.code || -1,
      `${response ? `response: `.concat(response.msg) : ``}`
    );
    return [accept, reject];
  }
};

//+--------------------------------------------------------------------------------------+
//| Cancel - closes pending orders by batch;                                             |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (cancels: Array<Partial<IRequestAPI>>) => {
  console.log(`-> Cancel [API]`);

  const method = "POST";
  const path = "/api/v1/trade/cancel-batch-orders";
  const body = JSON.stringify(cancels.map(({ instId, orderId }) => ({ instId, orderId })));
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
      return await Response.Request(json, { success: "Closed", fail: "Canceled" });
    } else throw new Error(`Order.Cancel: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error] Order.Cancel:", error, method, headers, body);
    return undefined;
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
        return await Response.Request(json, { success: "Pending", fail: "Rejected" });
      } else throw new Error(`Order.Submit: Response not ok: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(">> [Error] Order.Submit:", error, method, headers, body);
    }
  } else return [];
};
