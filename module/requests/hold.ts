//+--------------------------------------------------------------------------------------+
//|                                                                   [requests] hold.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";
import type { IPublishResult, TResponse } from "db/query.utils";
import type { IRequestAPI } from "api/requests";

import { hexString } from "lib/std.util";
import { Session } from "module/session";

import * as RequestAPI from "api/requests";
import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";

//-- [Process.Orders] Resubmit requests canceled by modification to the API for orders in hold state
type Accumulator = { requests: Partial<IRequestAPI>[]; closures: Partial<IRequest>[] };

export const Hold = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const orders = await Orders.Fetch({ status: "Hold", account: Session().account });
  if (!orders) return [];
  console.log(`-> Requests.Hold: Processing ${orders.length} hold orders`);

  // 1. Prepare API cancel batch and corrective closures for non-pending orders
  const { requests, closures } = orders.reduce(
    (acc: Accumulator, order) => {
      order.request_status === `Pending`
        ? acc.requests.push({
            instId: order.symbol,
            orderId: parseInt(hexString(order.order_id!, 10)).toString(),
            clientOrderId: hexString(order.request!, 12),
          })
        : acc.closures.push({
            ...order,
            status: order.request_status,
            memo: `[Info] Requests.Hold: Hold request set to ${order.request_status}`,
            update_time: new Date(),
          });
      return acc;
    },
    {
      requests: [] as Array<Partial<IRequestAPI>>,
      closures: [] as Array<Partial<IRequest>>,
    }
  );

  const cancels = await RequestAPI.Cancel(requests);

  // 2. Process results (Parallel resubmission for successes)
  const results = await Promise.all([
    ...closures.map(async (closed) => {
      const resub = await Request.Submit(closed);

      return {
        ...resub,
        response: { ...resub.response, outcome: "closed" } as TResponse,
      };
    }),
    ...cancels.map(async (cancel) => {
      // If the cancel failed, return the "hold" state immediately
      if (!cancel.response.success) {
        return {
          ...cancel,
          response: { ...cancel.response, outcome: "hold" } as TResponse,
        };
      }

      // If cancel succeeded, resubmit the request
      try {
        const resub = await Request.Submit({
          request: cancel.key?.request,
          status: `Queued`,
          memo: `[Info] Requests.Hold: Hold request successfully resubmitted`,
          update_time: new Date(),
        });

        return {
          ...resub,
          response: { ...resub.response, outcome: "requeued" } as TResponse,
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
          } as TResponse,
        };
      }
    }),
  ]);

  return results;
};
