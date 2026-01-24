//+--------------------------------------------------------------------------------------+
//|                                                                 [requests] queued.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "api/requests";
import type { IRequest } from "db/interfaces/request";

import { hexify } from "lib/crypto.util";
import { Select, Summary } from "db/query.utils";
import { Session } from "module/session";

import * as Leverage from "db/interfaces/leverage";
import * as Request from "db/interfaces/request";
import * as RequestAPI from "api/requests";

//-- [Process.Orders] Submit local requests to the API
type Accumulator = { queue: Partial<IRequestAPI>[]; expire: Partial<IRequest>[] };

export const Queued = async () => {
  const requests = await Select<IRequestAPI>({ status: "Queued", account: Session().account }, { table: `vw_api_requests` });

  if (!requests.length) return [];
  console.log(`-> Requests.Queued: Processing ${requests.length} queued requests`);

  const expiry = new Date();
  const { queue, expire } = requests.reduce(
    (acc: Accumulator, request) => {
      expiry < request.expiry_time!
        ? acc.queue.push(request)
        : acc.expire.push({
            request: hexify(request.clientOrderId!, 6),
            status: "Expired",
            update_time: expiry,
            memo: `[Expired]: Queued request changed to Expired`,
          });
      return acc;
    },
    { queue: [], expire: [] }
  );

  const [expired, leverage] = await Promise.all([
    Promise.all(expire.map(async (r) => Request.Submit(r))),
    Promise.all(
      queue.map(async (r) => {
        Leverage.Submit({ instId: r.instId, positionSide: r.positionSide, leverage: r.leverage, marginMode: r.marginMode });
      })
    ),
  ]);
  
  const submitted = await RequestAPI.Submit(queue);
  return Summary([...expired, ...leverage, ...submitted].map((r) => r?.response));
};
