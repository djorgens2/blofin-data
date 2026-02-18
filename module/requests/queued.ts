//+--------------------------------------------------------------------------------------+
//|                                                                 [requests] queued.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, IRequestAPI } from "api";
import type { IRequest } from "db/interfaces/request";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { hexify } from "lib/crypto.util";
import { Select } from "db/query.utils";
import { Session } from "module/session";

import * as Leverage from "db/interfaces/leverage";
import * as Request from "db/interfaces/request";
import * as API from "api/interfaces/requests";

//-- [Process.Orders] Submit local requests to the API
type Accumulator = { queue: Partial<IRequestAPI>[]; expire: Partial<IRequest>[] };

export const Queued = async (): Promise<Array<IPublishResult<IRequest | IInstrumentPosition>>> => {
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
    { queue: [], expire: [] },
  );

  const [expired, leverage] = await Promise.all([
    Promise.all(expire.map(async (request) => Request.Submit(request))),
    Promise.all(
      queue.map(async (request) => {
        console.log(`-> Requests.Queued: Processing leverage for request ${request.clientOrderId}`);
        return Leverage.Submit({ instId: request.instId, positionSide: request.positionSide, leverage: request.leverage, marginMode: request.marginMode });
      }),
    ),
  ]);

  const submitted = await API.Submit(queue) ?? [];
  return [...expired, ...leverage, ...submitted].flat();
};
