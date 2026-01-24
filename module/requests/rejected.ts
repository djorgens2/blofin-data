//+--------------------------------------------------------------------------------------+
//|                                                               [requests] rejected.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";
import type { IPublishResult } from "db/query.utils";

import { Session } from "module/session";

import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";

//-- [Process.Orders] Resubmits rejected requests to broker for execution; closes rejects beyond expiry
type Accumulator = { requeue: Partial<IRequest>[]; expire: Partial<IRequest>[] };

export const Rejected = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const rejects = await Orders.Fetch({ status: "Rejected", account: Session().account });

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
    }
  );
  const results = await Promise.all([
    ...requeue.map(async (req) => {
      const result = await Request.Submit(req);
      result.response.outcome = "requeued";
      return result;
    }),
    ...expire.map(async (req) => {
      const result = await Request.Submit(req);
      result.response.outcome = "expired";
      return result;
    }),
  ]);

  return results;
};
