//+--------------------------------------------------------------------------------------+
//|                                                               [requests] rejected.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "#db";
import type { IPublishResult } from "#api";

import { Session } from "#module/session";

import { Request, Order } from "#db";

//-- [Process.Orders] Resubmits rejected requests to broker for execution; closes rejects beyond expiry
type Accumulator = { requeue: Partial<IRequest>[]; expire: Partial<IRequest>[] };

export const Rejected = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const rejects = await Order.Fetch({ status: "Rejected", account: Session().account });

  if (!rejects) return [];
  console.log(`-> Requests.Rejected: Processing ${rejects.length} rejected orders`);

  const expiry = new Date();
  const { requeue, expire } = rejects.reduce(
    (acc: Accumulator, reject) => {
      expiry < reject.expiry_time!
        ? acc.requeue.push({ ...reject, status: `Queued`, update_time: expiry, memo: `[Retry]: Rejected request state changed to Queued and resubmitted` })
        : acc.expire.push({
            request: reject.request,
            status: `Expired`,
            update_time: expiry,
            memo: `[Expired]: Queued and Rejected request changed to Expired`,
          });
      return acc;
    },
    {
      requeue: [] as Array<Partial<IRequest>>,
      expire: [] as Array<Partial<IRequest>>,
    },
  );
  const results = await Promise.all([
    ...requeue.map(async (request) => {
      const result = await Request.Submit(request);
      result.response.state = "requeued";
      return result;
    }),
    ...expire.map(async (request) => {
      const result = await Request.Submit(request);
      result.response.state = "expired";
      return result;
    }),
  ]);

  return results;
};
