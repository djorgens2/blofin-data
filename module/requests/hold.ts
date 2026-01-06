//+--------------------------------------------------------------------------------------+
//|                                                                   [requests] hold.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";
import type { IRequestState } from "db/interfaces/state";
import type { IPublishResult, TResponse } from "db/query.utils";

import { hexString } from "lib/std.util";
import { Session } from "module/session";

import * as RequestAPI from "api/requests";
import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";
import * as States from "db/interfaces/state";

//-- [Process.Orders] Resubmit requests canceled by modification to the API for orders in hold state
export const Hold = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const orders = await Orders.Fetch({ status: "Hold", account: Session().account });
  if (!orders) return [];

  const queued = await States.Key<IRequestState>({ status: "Queued" });

  // 1. Execute Bulk Cancel
  const cancelPayload = orders.map(({ symbol, order_id }) => ({
    instId: symbol,
    orderId: BigInt(hexString(order_id!, 10)).toString(),
  }));

  const cancels = await RequestAPI.Cancel(cancelPayload);

  // 2. Process results (Parallel resubmission for successes)
  const results = await Promise.all(
    cancels.map(async (c) => {
      // If the cancel failed, return the "hold" state immediately
      if (!c.response.success) {
        return {
          ...c,
          response: { ...c.response, outcome: "hold" } as TResponse,
        };
      }

      // If cancel succeeded, resubmit the request
      try {
        const resub = await Request.Submit({
          request: c.key?.request,
          state: queued,
          memo: `[Info] Trades.Hold: Hold request successfully resubmitted`,
          update_time: new Date(),
        });

        return {
          ...resub,
          response: { ...resub.response, outcome: "requeued" } as TResponse,
        };
      } catch (error) {
        // If resubmit fails after a successful cancel
        return {
          ...c,
          response: { 
            ...c.response, 
            success: false, 
            outcome: "error", 
            message: "Cancel succeeded, but Resubmit failed." 
          } as TResponse,
        };
      }
    })
  );

  return results;
};
