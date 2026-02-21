//+--------------------------------------------------------------------------------------+
//|                                                                  [stops]  pending.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopOrder } from "#db";

import { Session } from "#module/session";
import { StopOrder, StopRequest } from "#db";

//-- [Process.Stops] Closes pending stop orders on closed positions
type Accumulator = { pending: Partial<IStopOrder>[]; expired: Partial<IStopOrder>[] };

export const Pending = async () => {
  const requests = await StopOrder.Fetch({ status: "Pending", account: Session().account });

  if (requests) {
    const { pending, expired } = requests.reduce(
      (acc: Accumulator, request) => {
        const isOpen = request.position_status === "Open";
        const verify = {
          ...request,
          status: isOpen ? "Pending" : "Expired",
          memo: isOpen ? request.memo : `[Expired]: Pending order state changed to Expired`,
          update_time: new Date(),
        } as Partial<IStopOrder>;

        isOpen ? acc.pending.push(verify) : acc.expired.push(verify);
        return acc;
      },
      { pending: [] as Partial<IStopOrder>[], expired: [] as Partial<IStopOrder>[] }
    );

    const [verified, expiring] = await Promise.all([Promise.all(pending.map((p) => StopRequest.Submit(p))), Promise.all(expired.map((e) => StopRequest.Submit(e)))]);

    return {
      size: requests.length,
      resubmitted: verified.filter((r) => r).length,
      closed: expiring.filter((r) => r).length,
    };
  } else return { size: 0, resubmitted: 0, closed: 0 };
};
