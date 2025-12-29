//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  requests.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRequest, IRequestState } from "db/interfaces/state";
import type { IRequest } from "db/interfaces/request";

import { Session, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { Update } from "db/query.utils";

import * as States from "db/interfaces/state";

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

type TData = {
  orderId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

type TResponse = {
  code: string;
  msg: string;
  data: Array<TData>;
};

type Accumulator = { accepted: Partial<IRequest>[]; rejected: Partial<IRequest>[] };

//+--------------------------------------------------------------------------------------+
//| Handles responses received from WSS/API or POST calls;                               |
//+--------------------------------------------------------------------------------------+
const handleResponse = async (response: TResponse, props: { success: TRequest; fail: TRequest }) => {
  if (Array.isArray(response.data)) {
    const success = await States.Key<IRequestState>({ status: props.success });
    const fail = await States.Key<IRequestState>({ status: props.fail });
    const responses = response.data;

    const { accepted, rejected } = responses.reduce(
      (acc: Accumulator, order) => {
        const ifSuccess = parseInt(order.code) || 0;
        const request = {
          request: hexify(order.clientOrderId!, 6) || hexify(parseInt(order.orderId!), 6),
          order_id: hexify(parseInt(order.orderId!), 6),
          state: ifSuccess ? success : fail,
          memo: ifSuccess
            ? `[Info] Response.Request: Order ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Request: ${props.fail === "Rejected" ? `Order` : `Cancellation`} failed with code [${response.code}]: ${response.msg}`,
          update_time: new Date(),
        };

        ifSuccess ? acc.accepted.push(request) : acc.rejected.push(request);
        return acc;
      },
      { accepted: [] as IRequest[], rejected: [] as IRequest[] }
    );

    const results = await Promise.all([
      Promise.all(accepted.map((a) => Update<IRequest>(a, { table: `request`, keys: [{ key: `request` }] }))),
      Promise.all(rejected.map((r) => Update<IRequest>(r, { table: `request`, keys: [{ key: `request` }] }))),
    ]);

    return {
      total: response.data.length,
      accepted,
      rejected,
      updated: results.filter((r) => r),
      errors: results.filter((r) => !r),
    };
  } else {
    console.log(
      `-> [Error] Response.Request: Request not processed; error returned:`,
      response.code || -1,
      `${response ? `response: `.concat(response.msg) : ``}`
    );
    return {
      total: 0,
      accepted: [] as Partial<IRequest>[],
      rejected: [] as Partial<IRequest>[],
      updated: [] as Partial<IRequest>[],
      errors: [] as Partial<IRequest>[],
    };
  }
};

//+--------------------------------------------------------------------------------------+
//| Cancel - closes pending orders by batch;                                             |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (requests: Array<Partial<IRequestAPI>>) => {
  if (requests.length > 0) {
    console.log(`-> Cancel [API]`);

    const method = "POST";
    const path = "/api/v1/trade/cancel-batch-orders";
    const body = JSON.stringify(requests.map(({ instId, orderId }) => ({ instId, orderId })));
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
        return await handleResponse(json, { success: "Closed", fail: "Canceled" });
      } else throw new Error(`Order.Cancel: Response not ok: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(">> [Error] Order.Cancel:", error, method, headers, body);
      return undefined;
    }
  } else return undefined;
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
        return await handleResponse(json, { success: "Pending", fail: "Rejected" });
      } else throw new Error(`Order.Submit: Response not ok: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(">> [Error] Order.Submit:", error, method, headers, body);
      return undefined;
    }
  } else undefined;
};
