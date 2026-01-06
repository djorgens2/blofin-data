//+--------------------------------------------------------------------------------------+
//|                                                               [requests] rejected.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState } from "db/interfaces/state";
import type { IRequest } from "db/interfaces/request";
import type { IPublishResult } from "db/query.utils";

import { Session } from "module/session";
import { Update, PrimaryKey } from "db/query.utils";

import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";
import * as States from "db/interfaces/state";

//-- [Process.Orders] Resubmits rejected requests to broker for execution; closes rejects beyond expiry
type Accumulator = { requeue: Partial<IRequest>[]; expire: Partial<IRequest>[] };

export const Rejected = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const rejects = await Orders.Fetch({ status: "Rejected", account: Session().account });

  if (rejects) {
    const expiry_time = new Date();
    const [queued, expired] = await Promise.all([States.Key<IRequestState>({ status: "Queued" }), States.Key<IRequestState>({ status: "Expired" })]);

    const { requeue, expire } = rejects.reduce(
      (acc: Accumulator, reject) => {
        expiry_time < reject.expiry_time!
          ? acc.requeue.push({ ...reject, state: queued, update_time: expiry_time, memo: `[Retry]: Rejected request state changed to Queued and resubmitted` })
          : acc.expire.push({
              request: reject.request,
              state: expired,
              update_time: expiry_time,
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
        const result = await Update<IRequest>(req, { table: `requests`, keys: [{ key: `request` }] });
        return {
          key: PrimaryKey(req, [`request`]),
          response: { ...result, outcome: "expired" },
        } as IPublishResult<IRequest>;
      }),
    ]);

    return results;
  }

  return [];
};
