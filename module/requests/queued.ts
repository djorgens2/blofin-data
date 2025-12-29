//+--------------------------------------------------------------------------------------+
//|                                                                 [requests] queued.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "api/requests";

import { hexify } from "lib/crypto.util";
import { Select } from "db/query.utils";
import { Session } from "module/session";
import { Expired } from "module/requests/expired";

import * as LeverageAPI from "api/leverage";
import * as RequestAPI from "api/requests";

//-- [Process.Orders] Submit local requests to the API
type Accumulator = { queued: Partial<IRequestAPI>[]; expired: Partial<IRequestAPI>[] };

export const Queued = async () => {
  const requests = await Select<IRequestAPI>({ status: "Queued", account: Session().account }, { table: `vw_api_requests` });

  if (requests.length) {
    const expiry = new Date();
    const { queued, expired } = requests.reduce(
      (acc: Accumulator, request) => {
        expiry < request.expiry_time! ? acc.queued.push(request) : acc.expired.push({ ...request, memo: `[Expired]: Queued request changed to Expired` });
        return acc;
      },
      { queued: [], expired: [] }
    );

    const promises = queued.map(async (r) =>
      LeverageAPI.Leverage({ instId: r.instId, positionSide: r.positionSide, leverage: r.leverage, marginMode: r.marginMode })
    );
    const results = await Promise.all(promises);
    const updates = results.filter((result) => result);

    const {size, accepted, rejected} = await RequestAPI.Submit(queued) ?? { size: 0, accepted: 0, rejected: 0 };

    console.log(">> Trades.Queued: Requests in queue:", requests.length);
    requests.length && console.log("-> Queued requests submitted:", queued.length);
    accepted && console.log("   # [Info] Requests accepted:", accepted);
    rejected && console.log("   # [Error] Requests rejected:", rejected);
    updates.length && console.log("   # [Info] Leverages modified:", updates.length);

    expired.length && (await Expired(expired.map((r) => ({ request: hexify(r.clientOrderId!, 6), memo: r.memo }))));
  }
};
