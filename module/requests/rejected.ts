//+--------------------------------------------------------------------------------------+
//|                                                               [requests] rejected.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState } from "db/interfaces/state";
import type { IRequest } from "db/interfaces/request";

import { Session } from "module/session";
import { Expired } from "module/requests/expired";

import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";
import * as States from "db/interfaces/state";

//-- [Process.Orders] Resubmits rejected requests to broker for execution; closes rejects beyond expiry
export const Rejected = async () => {
  const rejects = await Orders.Fetch({ status: "Rejected", account: Session().account });

  if (rejects) {
    const requeued: Array<Partial<IRequest>> = [];
    const expired: Array<Partial<IRequest>> = [];
    const expiry_time = new Date();

    for (const reject of rejects)
      expiry_time < reject.expiry_time!
        ? requeued.push({ ...reject, memo: `[Retry]: Rejected request state changed to Queued and resubmitted` })
        : expired.push({ request: reject.request, memo: `[Expired]: Queued and Rejected request changed to Expired` });

    if (requeued.length) {
      const queued = await States.Key<IRequestState>({ status: "Queued" });
      const accepted = [];
      const rejected = [];

      for (const request of requeued) {
        const result = await Request.Submit({ ...request, state: queued, update_time: expiry_time });
        result ? accepted.push(request) : rejected.push(request);
      }

      console.log(">> [Info] Trades.Rejected: Request retries:", requeued.length);
      accepted.length && console.log("   # [Info] Rejected requests requeued:", accepted.length);
      rejected.length && console.log("   # [Error] Resubmitted requests rejected:", rejected.length);
    }

    expired.length && Expired(expired);
  }
};
