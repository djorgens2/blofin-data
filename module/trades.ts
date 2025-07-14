//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IInstrumentPosition } from "@db/interfaces/instrument_position";
import type { IRequestAPI } from "@api/requests";
import type { TRequest } from "@db/interfaces/state";

import { hexify } from "@lib/crypto.util";
import { setExpiry } from "@lib/std.util";

import * as InstrumentPosition from "@db/interfaces/instrument_position";
import * as RequestAPI from "@api/requests";
import * as OrderAPI from "@api/orders";
import * as Request from "@db/interfaces/request";
import * as State from "@db/interfaces/state";

export type TResponse = {
  orderId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

//+--------------------------------------------------------------------------------------+
//| Sets request states based on changes recieved from WSS/API or POST ops;              |
//+--------------------------------------------------------------------------------------+
const processResults = async (results: Array<TResponse>, success: TRequest, fail: TRequest) => {
  const accepted = [];
  const rejected = [];

  if (Array.isArray(results)) {
    for (const result of results) {
      const { code, msg, orderId, clientOrderId } = result;
      const request = hexify(clientOrderId);
      const [{ state, status }] = await State.Fetch({ status: code ? success : fail });
      const memo = `[${code}: ${msg}] [${orderId},${clientOrderId}] ${setExpiry("0s")} Order status set to ${status}`;

      request && (await Request.Update({ request, state, memo }));
      status === success ? accepted.push(result) : rejected.push(result);
    }
  }

  return [accepted, rejected];
};

//+--------------------------------------------------------------------------------------+
//| Reconciles request states with broker order history;                                 |
//+--------------------------------------------------------------------------------------+
const reconcileQueue = async () => {
  const audit = await Request.Reconcile();
  audit.length && console.log("Audit Corrections:", audit.length, audit);
};

//+--------------------------------------------------------------------------------------+
//| Resubmits rejected requests to broker for execution; closes rejects beyond expiry;   |
//+--------------------------------------------------------------------------------------+
const processRejected = async () => {
  const rejects = await Request.Fetch({ status: "Rejected" });
  const expiry = setExpiry("0s");
  const queued = [];
  const expired = [];

  if (rejects.length) {
    for (const reject of rejects) {
      if (expiry < reject.expiry_time!) {
        await Request.Update({ ...reject, status: "Queued" });
        queued.push(reject);
      } else {
        await Request.Update({ ...reject, status: "Closed" });
        expired.push(reject);
      }
    }
    queued.length && console.log("Request Retries:", queued.length, queued);
    expired.length && console.log("Requests Expired:", expired.length, expired);
  }
};

//+--------------------------------------------------------------------------------------+
//| Closes pending orders beyond expiry;                                                 |
//+--------------------------------------------------------------------------------------+
const processPending = async () => {
  const requests = await Request.Fetch({ status: "Pending" });
  const expiry = setExpiry("0s");
  const pending: Array<Partial<IInstrumentPosition>> = [];
  const expired = [];
  const closed = [];

  if (requests.length) {
    for (const request of requests) {
      const { instrument, position } = request;
      if (expiry < request.expiry_time!) {
        request.order_status === "Pending" ? pending.push({ instrument, position, status: "Pending" }) : closed.push(request);
      } else {
        await Request.Update({ ...request, status: "Canceled" });
        expired.push(request);
      }
    }

    pending.length && (await InstrumentPosition.Update(pending));

    if (closed.length)
      for (const order of closed) {
        await Request.Update({ ...order, state: order.order_state });
      }

    pending.length && console.log("Requests Pending:", pending.length);
    expired.length && console.log("Requests Canceled:", expired.length, expired);
    closed.length && console.log("Orders Closed:", closed.length, closed);
  }
};

//+--------------------------------------------------------------------------------------+
//| Submit local requests to the API;                                                    |
//+--------------------------------------------------------------------------------------+
const processQueued = async () => {
  const requests = await Request.Queue({ status: "Queued" });

  if (requests.length) {
    const queue: Array<Partial<IRequestAPI>> = [];

    for (const request of requests) {
      const { status, ...order } = request;
      queue.push(order);
    }
    const results = await RequestAPI.Submit(queue);
    const [accepted, rejected] = await processResults(results, "Pending", "Rejected");

    console.log("Orders Accepted:", accepted.length, accepted);
    console.log("Orders Rejected:", rejected.length, rejected);
  }
};

//+--------------------------------------------------------------------------------------+
//| Ssumit Cancel requests to the API for orders in canceled state;                      |
//+--------------------------------------------------------------------------------------+
const processCanceled = async () => {
  const requests = await Request.Fetch({ status: "Canceled" });
  const cancels = [];

  if (requests.length) {
    for (const request of requests) {
      if (request.order_status === "Closed") {
        await Request.Update({ ...request, status: "Closed", memo: "Order canceled" });
      } else {
        cancels.push({
          instId: request.symbol,
          orderId: request.order_id?.toString(),
        });
      }
    }
    const results = await OrderAPI.Cancel(cancels);
    const [accepted, rejected] = await processResults(results, "Closed", "Canceled");

    console.log("Cancels Closed:", accepted.length, accepted);
    console.log("Cancels Rejected:", rejected.length, rejected);
  }
};

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  await reconcileQueue();
  await processRejected();
  await processPending();
  await processCanceled();
  await processQueued();
};
