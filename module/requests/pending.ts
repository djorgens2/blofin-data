//+--------------------------------------------------------------------------------------+
//|                                                                [requests] pending.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";
import type { IPublishResult, TResponse } from "db/query.utils";

import { Session } from "module/session";

import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";

//-- [Process.Orders] Closes pending orders beyond expiry
type Accumulator = { verify: Partial<IRequest>[]; expire: Partial<IRequest>[] };

export const Pending = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const requests = await Orders.Fetch({ status: "Pending", account: Session().account });
  const expiry = new Date();

  if (!requests) return [];

  const { verify, expire } = requests.reduce(
    (acc: Accumulator, request) => {
      expiry < request.expiry_time! ? acc.verify.push(request) : acc.expire.push(request);
      return acc;
    },
    {
      verify: [] as Array<Partial<IRequest>>,
      expire: [] as Array<Partial<IRequest>>,
    }
  );

  const promises = [
    ...verify.map(async (request) => {
      const result = await Request.Submit({ ...request, update_time: expiry });
      result.response.outcome = "pending";
      return result;
    }),

    ...expire.map(async ({ request }) => {
      const cancels = await Request.Cancel({
        request,
        memo: `[Expired]: Pending order changed to Canceled`,
      });

      return cancels.map((c) => ({
        ...c,
        response: {
          ...c.response,
          outcome: "expired",
        } as TResponse,
      }));
    }),
  ];

  const result = await Promise.all(promises);
  return result.flat();
};
