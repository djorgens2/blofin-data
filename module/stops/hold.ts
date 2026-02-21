//+--------------------------------------------------------------------------------------+
//|                                                                     [stops]  hold.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopOrderAPI } from "#api";
import type { IStopRequest } from "#db/interfaces/stop_request";

import { StopOrder, StopRequest } from "#db";
import { StopRequests } from "#api";
import { Session } from "#module/session";

import { hexString } from "#lib/std.util";

/**
 * Resubmits stop requests canceled by modification in 'Hold' state
 * Returns execution statistics for the caller
 */
type Accumulator = { requests: Partial<IStopOrderAPI>[]; closures: Partial<IStopRequest>[] };

export const Hold = async () => {
  const account = Session().account;
  const orders = await StopOrder.Fetch({ status: "Hold", account });

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
      requests: [] as Array<Partial<IStopOrderAPI>>,
      closures: [] as Array<Partial<IStopRequest>>,
    },
  );

  const cancels = await StopRequests.Cancel(requests);

  const results = await Promise.all([
    ...closures.map(async (closed) => {
      const resub = await StopRequest.Submit(closed);
      return {
        ...resub,
        response: { ...resub, state: "closed" },
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
        const resub = await StopRequests.Submit({
          stop_request: cancel.key?.stop_request,
          status: `Queued`,
          memo: `[Info] Stop.Requests.Hold: Request successfully resubmitted`,
          update_time: new Date(),
        });

        return {
          ...resub,
          response: { ...resub, outcome: "requeued" },
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
