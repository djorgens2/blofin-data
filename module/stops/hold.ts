//+--------------------------------------------------------------------------------------+
//|                                                                     [stops]  hold.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopsAPI } from "api/stops";
import type { IStopRequest } from "db/interfaces/stop_request";

import { hexString } from "lib/std.util";
import { Session } from "module/session";
import { Fetch } from "db/interfaces/stops";
import { Submit } from "db/interfaces/stop_request";

import * as Request from "api/stop_requests";

/**
 * Resubmits stop requests canceled by modification in 'Hold' state
 * Returns execution statistics for the caller
 */
type Accumulator = { requests: Partial<IStopsAPI>[]; closures: Partial<IStopRequest>[] };

export const Hold = async () => {
  const account = Session().account;
  const orders = await Fetch({ status: "Hold", account });

  if (!orders) return [];
  console.log(`-> Stop.Requests.Hold: Processing ${orders.length} hold orders`);

  const { requests, closures } = orders.reduce(
    (acc: Accumulator, order) => {
      order.request_status === `Pending`
        ? acc.requests.push({
            instId: order.symbol,
            tpslId: parseInt(hexString(order.tpsl_id!, 10)).toString(),
          })
        : acc.closures.push({
            ...order,
            status: order.request_status,
            memo: `[Info] Stop.Requests.Hold: Request status set to ${order.request_status}`,
            update_time: new Date(),
          });
      return acc;
    },
    {
      requests: [] as Array<Partial<IStopsAPI>>,
      closures: [] as Array<Partial<IStopRequest>>,
    },
  );

  const cancels = await Request.Cancel(requests);

  const results = await Promise.all([
    ...closures.map(async (closed) => {
      const resub = await Submit(closed);
      return {
        ...resub,
        response: { ...resub.response, outcome: "closed" },
      };
    }),

    ...cancels.map(async (cancel) => {
      // If the cancel failed, return the "hold" state immediately
      if (!cancel.response.success) {
        return {
          ...cancel,
          response: { ...cancel.response, outcome: "hold" },
        };
      }

      // If cancel succeeded, resubmit the request
      try {
        const resub = await Submit({
          stop_request: cancel.key?.stop_request,
          status: `Queued`,
          memo: `[Info] Stop.Requests.Hold: Request successfully resubmitted`,
          update_time: new Date(),
        });

        return {
          ...resub,
          response: { ...resub.response, outcome: "requeued" },
        };
      } catch (error) {
        // If resubmit fails after a successful cancel
        return {
          ...cancel,
          response: {
            ...cancel.response,
            success: false,
            outcome: "error",
            message: "Cancel succeeded, but Resubmit failed.",
          },
        };
      }
    }),
  ]);

  return results;
};
