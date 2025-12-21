//+--------------------------------------------------------------------------------------+
//|                                                                [requests] expired.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";

import * as Request from "db/interfaces/request";

//-- [Process.Orders] Expires requests beyond expiry
export const Expired = async (expired: Array<Partial<IRequest>>) => {
  if (expired.length) {
    const accepted = [];
    const rejected = [];

    for (const request of expired) {
      const result = await Request.Submit({
        ...request,
        status: "Expired",
        update_time: new Date(),
        memo: request.memo || `[Expired]: Request expired beyond set expiry time`,
      });
      result ? accepted.push(result) : rejected.push(result);
    }

    console.log("-> Pending expired requests:", expired.length);
    accepted.length && console.log("   # [Info] Expired requests accepted:", accepted.length);
    rejected.length && console.log("   # [Error] Expired requests rejected:", rejected.length);
  }
};
