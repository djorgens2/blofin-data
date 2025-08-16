//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IRequestAPI } from "@api/requests";
import type { TRequest } from "@db/interfaces/state";
import type { IRequest } from "@db/interfaces/request";

import { hexify } from "@lib/crypto.util";
import { setExpiry } from "@lib/std.util";

import * as PositionsAPI from "@api/positions";
import * as RequestAPI from "@api/requests";
import * as OrderAPI from "@api/orders";
import * as StopsAPI from "@api/stops";
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

      request && (await Request.Submit({ request, state, memo }));
      status === success ? accepted.push(result) : rejected.push(result);
    }
  }

  return [accepted, rejected];
};

//+--------------------------------------------------------------------------------------+
//| Audits Request Queue; reconciles request state on change using broker order history; |
//+--------------------------------------------------------------------------------------+
const reconcileQueue = async () => {
  const audit = await Request.Audit();
  audit.length && console.log("Audit Updates:", audit.length, audit);
};

//+--------------------------------------------------------------------------------------+
//| Resubmits rejected requests to broker for execution; closes rejects beyond expiry;   |
//+--------------------------------------------------------------------------------------+
const processRejected = async () => {
  const rejects = await Request.Fetch({ status: "Rejected" });
  const expiry = setExpiry("0s");
  const requeued: Array<Partial<IRequest>> = [];
  const expired: Array<Partial<IRequest>> = [];

  if (rejects.length) {
    for (const reject of rejects) {
      expiry < reject.expiry_time!
        ? requeued.push({ request: reject.request, status: "Queued", memo: `Retry: Rejected request state changed from ${reject.status} to Queued` })
        : expired.push({ request: reject.request, status: "Closed", memo: `Retry: Rejected request state changed from ${reject.status} to Closed` });
    }
  }

  const updated = [...requeued, ...expired];

  if (updated.length) {
    for (const request of updated) await Request.Submit(request);

    requeued.length && console.log("Request Retries:", requeued.length, requeued);
    expired.length && console.log("Requests Expired:", expired.length, expired);
  }
};

//+--------------------------------------------------------------------------------------+
//| Closes pending orders beyond expiry;                                                 |
//+--------------------------------------------------------------------------------------+
const processPending = async () => {
  const requests = await Request.Fetch({ status: "Pending" });
  const expiry = setExpiry("0s");
  const pending: Array<Partial<IRequest>> = [];
  const expired: Array<Partial<IRequest>> = [];

  if (requests.length) {
    for (const request of requests) {
      expiry < request.expiry_time!
        ? pending.push({ status: "Pending" })
        : expired.push({ request: request.request, status: "Canceled", memo: `Expired: Pending request state changed from ${request.status} to Canceled` });
    }
  }

  if (expired.length) {
    for (const request of expired) await Request.Submit(request);

    pending.length && console.log("Requests Pending:", pending.length);
    expired.length && console.log("Requests Canceled:", expired.length, expired);
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
      const { status, ...submit } = request;
      queue.push(submit);
    }
    
    const results = await RequestAPI.Submit(queue);
    const [accepted, rejected] = await processResults(results, "Pending", "Rejected");

    accepted.length && console.log("Orders Accepted:", accepted.length, accepted);
    rejected.length && console.log("Orders Rejected:", rejected.length, rejected);
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
      cancels.push({
        instId: request.symbol,
        orderId: request.order_id?.toString(),
      });
    }
  }
  const results = await OrderAPI.Cancel(cancels);
  const [accepted, rejected] = await processResults(results, "Closed", "Canceled");

  accepted.length && console.log("Cancels Closed:", accepted.length, accepted);
  rejected.length && console.log("Cancels Rejected:", rejected.length, rejected);
};

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  console.log("In Execute.Trades:", new Date().toLocaleString());

  await PositionsAPI.Import();
  await OrderAPI.Import();
  await StopsAPI.Import();

  await reconcileQueue();
  await processRejected();
  await processPending();
  await processCanceled();
  await processQueued();
};
