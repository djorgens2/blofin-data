//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IRequestAPI } from "@api/requests";
import type { IRequest } from "@db/interfaces/request";

import { hexify } from "@lib/crypto.util";
import { setExpiry } from "@lib/std.util";

import * as PositionsAPI from "@api/positions";
import * as RequestAPI from "@api/requests";
import * as OrderAPI from "@api/orders";
import * as StopsAPI from "@api/stops";
import * as Request from "@db/interfaces/request";
import * as Order from "@db/interfaces/request";

//+--------------------------------------------------------------------------------------+
//| Audits Request Queue; reconciles request state on change using broker order history; |
//+--------------------------------------------------------------------------------------+
const processAudit = async () => {
  const audit = await Request.Audit();
  audit.length && console.log("   [Trades.Audit] INFO Audit Updates:", audit.length);
};

//+--------------------------------------------------------------------------------------+
//| Resubmits rejected requests to broker for execution; closes rejects beyond expiry;   |
//+--------------------------------------------------------------------------------------+
const processRejected = async () => {
  const rejects = await Request.Fetch({ status: "Rejected" });
  const expiry = setExpiry("0s");
  const requeued: Array<Partial<IRequest>> = [];
  const expired: Array<Partial<IRequest>> = [];

  if (rejects.length)
    for (const reject of rejects)
      expiry < reject.expiry_time!
        ? requeued.push({ ...reject, memo: `[Retry]: Rejected request state changed to Queued and resubmitted` })
        : expired.push({ request: reject.request, memo: `[Expired]: Queued request state changed to Canceled` });

  if (requeued.length) for (const request of requeued) await Request.Submit(request);
  if (expired.length) for (const request of expired) await Request.Cancel({ request: request.request!, memo: request.memo! });

  requeued.length && console.log("   [Trades.Rejected] INFO Request Retries:", requeued.length, "requeued");
  expired.length && console.log("   [Trades.Rejected] WARN Requests Expired:", expired.length, "expired");
};

//+--------------------------------------------------------------------------------------+
//| Closes pending orders beyond expiry;                                                 |
//+--------------------------------------------------------------------------------------+
const processPending = async () => {
  const requests = await Request.Fetch({ status: "Pending" });
  const expiry = setExpiry("0s");
  const pending: Array<Partial<IRequest>> = [];
  const expired: Array<Partial<IRequest>> = [];

  if (requests.length)
    for (const request of requests)
      expiry < request.expiry_time!
        ? pending.push({ status: "Pending" })
        : expired.push({ request: request.request, memo: `[Expired]: Pending order state changed to Canceled` });

  if (expired.length) {
    for (const request of expired) await Request.Cancel({ request: request.request!, memo: request.memo! });

    pending.length && console.log("   [Trades.Pending] INFO: Requests Pending:", pending.length);
    expired.length && console.log("   [Trades.Pending] WARN: Requests Canceled:", expired.length, expired);
  }
};

//+--------------------------------------------------------------------------------------+
//| Submit local requests to the API;                                                    |
//+--------------------------------------------------------------------------------------+
const processQueued = async () => {
  const requests = await Request.Queue({ status: "Queued" });
  const expiry = setExpiry("0s");
  const queue: Array<Partial<IRequestAPI>> = [];
  const expired: Array<Partial<IRequest>> = [];

  if (requests.length) {
    for (const api of requests) {
      const { status, expiryTime, ...submit } = api;
      expiry < expiryTime!
        ? queue.push(submit)
        : expired.push({ request: hexify(api.clientOrderId!, 6), memo: `[Expired]: Queued request state changed to Canceled` })
    }

    if (expired.length) for (const request of expired) await Request.Cancel({ request: request.request!, memo: request.memo! });

    const [accepted, rejected, errors] = await RequestAPI.Submit(queue);

    accepted.length && console.log("   [Trades.Queued] INFO Orders Accepted:", accepted.length, "accepted");
    rejected.length && console.log("   [Trades.Queued] ERROR Requests Rejected:", rejected.length, "rejected");
    expired.length && console.log("   [Trades.Queued] WARN Requests Expired:", expired.length, "expired");
    errors.length && console.log("   [Trades.Queued] ERROR Cancellation Errors:", errors.length, "errors");
  }
};

//+--------------------------------------------------------------------------------------+
//| Ssumit Cancel requests to the API for orders in canceled state;                      |
//+--------------------------------------------------------------------------------------+
const processCanceled = async () => {
  const orders = await Order.Fetch({ status: "Canceled" });
  const cancels = [];

  if (orders.length) for (const order of orders) order.order_id && cancels.push({ instId: order.symbol, orderId: order.order_id.toString() });

  const [accepted, rejected, errors] = await OrderAPI.Cancel(cancels);

  accepted.length && console.log("   [Trades.Canceled] INFO Cancels Closed:", accepted.length, "accepted");
  rejected.length && console.log("   [Trades.Canceled] WARN Cancels Rejected:", rejected.length, "rejected");
  errors.length && console.log("   [Trades.Canceled] ERROR Cancellation Errors:", errors.length, "errors");
};

// Public functions

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  console.log("In Execute.Trades:", new Date().toLocaleString());

  await PositionsAPI.Import();
  await OrderAPI.Import();
  await StopsAPI.Import();

  await processAudit();
  await processRejected();
  await processPending();
  await processCanceled();
  await processQueued();
};
