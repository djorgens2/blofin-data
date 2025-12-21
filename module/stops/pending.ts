//+--------------------------------------------------------------------------------------+
//|                                                                  [stops]  pending.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStops } from "db/interfaces/stops";

import { Session } from "module/session";
import { Fetch, Submit } from "db/interfaces/stops";

//-- [Process.Stops] Closes pending stop orders on closed positions
type Accumulator = { pending: Partial<IStops>[]; expired: Partial<IStops>[] };

export const Pending = async () => {
  const requests = await Fetch({ status: "Pending", account: Session().account });

  if (requests) {
    const { pending, expired } = requests.reduce(
      (acc: Accumulator, request) => {
        const isOpen = request.position_status === "Open";
        const verify = {
          ...request,
          status: isOpen ? "Pending" : "Expired",
          memo: isOpen ? request.memo : `[Expired]: Pending order state changed to Expired`,
          update_time: new Date(),
        } as Partial<IStops>;

        isOpen ? acc.pending.push(verify) : acc.expired.push(verify);
        return acc;
      },
      { pending: [] as Partial<IStops>[], expired: [] as Partial<IStops>[] }
    );

    const [verified, expiring] = await Promise.all([Promise.all(pending.map((p) => Submit(p))), Promise.all(expired.map((e) => Submit(e)))]);

    return {
      size: requests.length,
      resubmitted: verified.filter((r) => r).length,
      closed: expiring.filter((r) => r).length,
    };
  } else return { size: 0, resubmitted: 0, closed: 0 };
};
