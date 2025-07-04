//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IRequestAPI } from "@api/requests";
import type { IOrderAPI } from "@api/orders";

import { hexify } from "@lib/crypto.util";
import { setExpiry } from "@lib/std.util";

import * as Request from "@db/interfaces/request";
import * as RequestAPI from "@api/requests";
import * as OrderAPI from "@api/orders";

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
//| Formats and emits order requests to broker for execution;                            |
//+--------------------------------------------------------------------------------------+
const processRejected = async () => {
  const rejects = await Request.Fetch({ status: "Rejected" });
  const expiry = setExpiry("0s");

  let queued: number = 0;
  let closed: number = 0;

  for (const id in rejects) {
    const reject = rejects[id];
    if (expiry < reject.expiry_time!) {
      await Request.Update({ ...reject, status: "Queued" });
      queued++;
    } else {
      await Request.Update({ ...reject, status: "Closed" });
      closed++;
    }
  }
  return [queued, closed];
};

//+--------------------------------------------------------------------------------------+
//| Closes pending orders beyond expiry;                                                 |
//+--------------------------------------------------------------------------------------+
const processPending = async () => {
  const requests = await Request.Fetch({ status: "Pending" });
  const expiry = setExpiry("0s");

  let pending: number = 0;
  let canceled: number = 0;

  for (const request of requests) {
    if (expiry < request.expiry_time!) {
      pending++;
    } else {
      await Request.Update({ ...request, status: "Canceled" });
      canceled++;
    }
  }
  return [pending, canceled];
};

//+--------------------------------------------------------------------------------------+
//| Submit local requests to the API;                                                    |
//+--------------------------------------------------------------------------------------+
const processQueued = async () => {
  const requests = await Request.Queue({ status: "Queued" });
  const queue: Array<Partial<IRequestAPI>> = [];

  for (const request of requests) {
    const api: Partial<IRequestAPI> = {
      instId: request.instId,
      marginMode: request.marginMode,
      positionSide: request.positionSide,
      side: request.side,
      orderType: request.orderType,
      price: request.price,
      size: request.size,
      leverage: request.leverage,
      reduceOnly: request.reduceOnly,
      clientOrderId: request.clientOrderId,
      brokerId: request.brokerId ? request.brokerId : undefined,
    };
    queue.push(api);
  }
  await RequestAPI.Submit(queue);
  return requests.length;
};

//+--------------------------------------------------------------------------------------+
//| Ssumit Cancel requests to the API for orders in canceled state;                      |
//+--------------------------------------------------------------------------------------+
const processCanceled = async () => {
  const requests = await Request.Fetch({ status: "Canceled" });
  const cancels: Array<Partial<IOrderAPI>> = [];

  for (const request of requests) {
    if (request.order_status === 'Closed') {

    } else {
    const cancel: Partial<IOrderAPI> = {
      orderId: request.order_id?.toString(),
      instId: request.symbol,
      clientOrderId: request.client_order_id,
    };
    cancels.push(cancel);
    }
  }
  const response = await OrderAPI.Cancel(cancels);
  return requests.length;
};

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  const [queued, closed] = await processRejected();
  const pending = await processPending();
  const canceled = await processCanceled();
  const processed = await processQueued();
}
