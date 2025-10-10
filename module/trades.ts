//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState } from "db/interfaces/state";
import type { IRequestAPI } from "api/requests";
import type { IRequest } from "db/interfaces/request";

import { hexify } from "lib/crypto.util";
import { Session } from "module/session";

import * as PositionsAPI from "api/positions";
import * as RequestAPI from "api/requests";
import * as OrderAPI from "api/orders";
import * as StopsAPI from "api/stops";

import * as Request from "db/interfaces/request";
import * as Order from "db/interfaces/order";
import * as Stops from "db/interfaces/stops";
import * as States from "db/interfaces/state";


//------------------ Private functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Resubmits rejected requests to broker for execution; closes rejects beyond expiry;   |
//+--------------------------------------------------------------------------------------+
const processRejected = async () => {
  const requeued: Array<Partial<IRequest>> = [];
  const expired: Array<Partial<IRequest>> = [];

  const rejects = await Order.Fetch({ status: "Rejected", account: Session().account });
  const expiry = new Date();

  if (rejects)
    for (const reject of rejects)
      expiry < reject.expiry_time!
        ? requeued.push({ ...reject, memo: `[Retry]: Rejected request state changed to Queued and resubmitted` })
        : expired.push({ request: reject.request, memo: `[Expired]: Queued request state changed to Canceled` });

  if (requeued.length) for (const request of requeued) await Request.Submit(request);
  if (expired.length) for (const request of expired) await Request.Cancel({ request: request.request!, memo: request.memo! });

  requeued.length && console.log(">> [Info] Trades.Rejected: Request retries:", requeued.length, "resubmitted");
  expired.length && console.log(">> [Warning] Trades.Rejected: Requests expired:", expired.length, "canceled");
};

//+--------------------------------------------------------------------------------------+
//| Closes pending orders beyond expiry;                                                 |
//+--------------------------------------------------------------------------------------+
const processPending = async () => {
  const pending: Array<Partial<IRequest>> = [];
  const expired: Array<Partial<IRequest>> = [];

  const requests = await Order.Fetch({ status: "Pending", account: Session().account });
  const expiry = new Date();

  if (requests)
    for (const request of requests)
      expiry < request.expiry_time!
        ? pending.push({ status: "Pending" })
        : expired.push({ request: request.request, memo: `[Expired]: Pending order state changed to Canceled` });

  if (expired.length) {
    for (const request of expired) await Request.Cancel({ request: request.request!, memo: request.memo! });

    pending.length && console.log(">> [Info] Trades.Pending: Requests pending:", pending.length);
    expired.length && console.log(">> [Warning] Trades.Pending: Requests canceled:", expired.length, expired);
  }
};

//+--------------------------------------------------------------------------------------+
//| Submit local requests to the API;                                                    |
//+--------------------------------------------------------------------------------------+
const processQueued = async () => {
  const queued: Array<Partial<IRequestAPI>> = [];
  const expired: Array<Partial<IRequest>> = [];
  const expiry = new Date();

  const requests = await Request.Queue({ status: "Queued", account: Session().account });

  if (requests) {
    for (const request of requests) {
      const { status, account, expiry_time, ...api } = request;

      if (expiry < expiry_time!) {
        queued.push(api);
      } else expired.push({ request: hexify(api.clientOrderId!, 6), account, memo: `[Expired]: Queued request state changed to Canceled` });
    }

    console.log(">> Trades.Queued: Requests processed:", requests.length);

    if (queued.length) {
      const [accepted, rejected] = (await RequestAPI.Submit(queued)) ?? [[], []];
      requests.length && console.log("-> Queued requests submitted:", queued.length);
      accepted.length && console.log("   # [Info] Requests accepted:", accepted.length);
      rejected.length && console.log("   # [Error] Requests rejected:", rejected.length);
    }

    if (expired.length) {
      const accepted = [];
      const rejected = [];

      for (const request of expired) {
        const result = await Request.Cancel(request);
        result ? accepted.push(result) : rejected.push(result);
      }
      requests.length && console.log("-> Expired requests submitted:", expired.length);
      accepted.length && console.log("   # [Info] Expired requests accepted:", accepted.length);
      rejected.length && console.log("   # [Error] Expired requests rejected:", rejected.length);
    }
  }
};

//+--------------------------------------------------------------------------------------+
//| Submit Cancel requests to the API for orders in canceled state;                      |
//+--------------------------------------------------------------------------------------+
const processCanceled = async () => {
  const orders = await Order.Fetch({ status: "Canceled", account: Session().account });

  if (orders) {
    const cancels = [];

    for (const order of orders) {
      order.order_id && cancels.push({ instId: order.symbol, orderId: order.order_id.toString() });
    }

    const [accepted, rejected] = (await OrderAPI.Cancel(cancels)) ?? [[], []];

    cancels.length && console.log(">> Trades.Canceled: Cancel requests submitted:", cancels.length);
    accepted.length && console.log("   # [Info] Canceled requests accepted:", accepted.length);
    rejected.length && console.log("   # [Error] Canceled requests rejected:", rejected.length);
  }
};

//+--------------------------------------------------------------------------------------+
//| Resubmit requests canceled by modification to the API for orders in hold state;      |
//+--------------------------------------------------------------------------------------+
const processHold = async () => {
  const orders = await Order.Fetch({ status: "Hold", account: Session().account });
  const accepted = [];
  const rejected = [];

  if (orders) {
    const queued = await States.Key<IRequestState>({ status: "Queued" });
    const [processed, errors] = (await OrderAPI.Cancel(orders.map(({ symbol, order_id }) => ({ instId: symbol, orderId: order_id!.toString() })))) ?? [[], []];

    for (const hold of processed) {
      const result = await Request.Submit({ request: hold.request!, state: queued, memo: `[Info] Trades.Hold: Hold request successfully resubmitted` });
      result ? accepted.push(result) : rejected.push(result);
    }

    console.log(">> Trades.Hold: Hold orders processed:", orders.length);
    processed && console.log("-> Hold orders submitted:", processed.length);
    accepted && console.log("   # [Info]: Hold orders accepted:", accepted.length);
    errors && console.log("-> Hold order errors:", errors.length);
    rejected && console.log("   # [Error] Hold orders rejected:", rejected.length);
  }
};

//+--------------------------------------------------------------------------------------+
//| Handle stop order submits, rejects, and updates (from hold status);                  |
//+--------------------------------------------------------------------------------------+
const processStops = async () => {
  const requests = await Stops.Fetch({ status: "Queued", account: Session().account });
  const cancels = await Stops.Fetch({ status: "Canceled", account: Session().account });
  const rejects = await Stops.Fetch({ status: "Rejected", account: Session().account });
  const holds = await Stops.Fetch({ status: "Hold", account: Session().account });

  requests && console.log(`   [Info] Process.Stops:  ${requests.length} stop requests`);
  cancels && console.log(`   [Info] Process.Stops:  ${cancels.length} stop cancels`);
  rejects && console.log(`   [Info] Process.Stops:  ${rejects.length} stop rejetcs`);
  holds && console.log(`   [Info] Process.Stops:  ${holds.length} stop holds`);
  // if (orders) {
  //   const success = await States.Key<IRequestState>({ status: "Queued" });
  //   const fail = await States.Key<IRequestState>({ status: "Rejected" });

  //   for (const order of orders) order.order_id && cancels.push({ instId: order.symbol, orderId: order.order_id.toString() });

  //   const result = await OrderAPI.Cancel(cancels);

  //   if (result) {
  //     console.log(">> [Info] Trades.Hold: Cancel requests submitted:", cancels.length);

  //     for (const order of result) {
  //       const result = await Request.Submit({ request: order.request!, state: order.state!, memo: order.memo! });
  //       result && console.log(">> [Info] Trades.Hold: Requests resubmitted:", result.length);
  //     }
  //   }
  // }
};

//------------------ Public functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  console.log("In Execute.Trades:", new Date().toLocaleString());

  await PositionsAPI.Import();
  await OrderAPI.Import();
  await StopsAPI.Import();

  await processRejected();
  await processPending();
  await processCanceled();
  await processHold();
  await processQueued();
  await processStops();
};
