//+--------------------------------------------------------------------------------------+
//|                                                                   [requests] hold.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState } from "db/interfaces/state";

import { hexString } from "lib/std.util";
import { Session } from "module/session";

import * as RequestAPI from "api/requests";
import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";
import * as States from "db/interfaces/state";

//-- [Process.Orders] Resubmit requests canceled by modification to the API for orders in hold state
export const Hold = async () => {
  const orders = await Orders.Fetch({ status: "Hold", account: Session().account });
  const accepted = [];
  const rejected = [];

  if (orders) {
    const queued = await States.Key<IRequestState>({ status: "Queued" });
    const cancels = orders.map(({ symbol, order_id }) => ({ instId: symbol, orderId: BigInt(hexString(order_id!, 10)).toString() }));
    const {size, accepted, rejected} = (await RequestAPI.Cancel(cancels)) ?? { size: 0, accepted: 0, rejected: 0 }

    for (const hold of accepted) {
      const result = await Request.Submit({
        request: hold.request!,
        state: queued,
        memo: `[Info] Trades.Hold: Hold request successfully resubmitted`,
        update_time: new Date(),
      });
      result ? accepted.push(result) : rejected.push(result);
    }

    console.log(">> Trades.Hold: Hold orders processed:", orders.length);
    processed.length && console.log("-> Hold orders submitted:", processed.length);
    accepted.length && console.log("   # [Info]: Hold orders accepted:", accepted.length);
    errors.length && console.log("-> Hold order errors:", errors.length);
    rejected.length && console.log("   # [Error] Hold orders rejected:", rejected.length);
  }
};
