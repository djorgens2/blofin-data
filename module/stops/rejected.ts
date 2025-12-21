//+--------------------------------------------------------------------------------------+
//|                                                                 [stops]  rejected.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStops } from "db/interfaces/stops";

import { Session } from "module/session";
import { Fetch, Submit } from "db/interfaces/stops";

//-- [Process.Stops] Resubmits rejected requests to broker for execution; closes rejects beyond expiry
type Accumulator = { queued: Partial<IStops>[]; closures: Partial<IStops>[] };

export const Rejected = async () => {
  const requests = (await Fetch({ status: "Rejected", account: Session().account })) ?? [];

  if (requests.length) {
    const { queued, closures } = requests.reduce(
      (acc: Accumulator, request) => {
        const isOpen = request.position_status === "Open";

        const resubmit: Partial<IStops> = {
          stop_request: request.stop_request,
          status: isOpen ? "Queued" : "Closed",
          memo: isOpen
            ? `[Retry]: Rejected request state changed to Queued and resubmitted`
            : `[Retry]: Rejected request on closed position; state changed to Closed`,
          update_time: new Date(),
        };

        isOpen ? acc.queued.push(resubmit) : acc.closures.push(resubmit);
        return acc;
      },
      { queued: [] as Partial<IStops>[], closures: [] as Partial<IStops>[] }
    );
    const [retryResults, closeResults] = await Promise.all([Promise.all(queued.map((q) => Submit(q))), Promise.all(closures.map((c) => Submit(c)))]);

    return {
      size: requests.length,
      resubmitted: retryResults.filter((r) => r).length,
      closed: closeResults.filter((r) => r).length,
    };
  } else return { size: 0, resubmitted: 0, closed: 0 };
};
