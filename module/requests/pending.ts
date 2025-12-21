//+--------------------------------------------------------------------------------------+
//|                                                                [requests] pending.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";

import { Session } from "module/session";

import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";

//-- [Process.Orders] Closes pending orders beyond expiry
export const Pending = async () => {
  const verify: Array<Partial<IRequest>> = [];
  const expired: Array<Partial<IRequest>> = [];

  const requests = await Orders.Fetch({ status: "Pending", account: Session().account });
  const expiry = new Date();

  if (requests) for (const pending of requests) expiry < pending.expiry_time! ? verify.push(pending) : expired.push({ request: pending.request });

  if (verify.length) {
    const update_time = new Date();
    const promises = verify.map((request) => Request.Submit({ ...request, update_time }));
    await Promise.all(promises);
    console.log(">> [Info] Trades.Pending: Requests pending:", verify.length);
  }

  if (expired.length) {
    const promises = expired.map(({ request }) => Request.Cancel({ request, memo: `[Expired]: Pending order state changed to Canceled` }));
    await Promise.all(promises);
    console.log(">> [Warning] Trades.Pending: Requests canceled:", expired.length);
  }
};
