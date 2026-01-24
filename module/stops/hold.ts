//+--------------------------------------------------------------------------------------+
//|                                                                     [stops]  hold.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopsAPI } from "api/stops";
import type { IRequestState } from "db/interfaces/state";

import { hexString } from "lib/std.util";
import { Session } from "module/session";
import { Fetch, Submit } from "db/interfaces/stops";

import * as StopsAPI from "api/stops";
import * as States from "db/interfaces/state";

/**
 * Resubmits stop requests canceled by modification in 'Hold' state
 * Returns execution statistics for the caller
 */
export const Hold = async () => {
  const account = Session().account;
  const holds = await Fetch({ status: "Hold", account });

  if (holds) {
    const cancels: Array<Partial<IStopsAPI>> = holds.map(({ symbol, tpsl_id, client_order_id }) => ({
      instId: symbol,
      tpslId: parseInt(hexString(tpsl_id!, 8)).toString(10),
      clientOrderId: parseInt(hexString(client_order_id!, 10)).toString(10),
    }));

    const [processed, errors] = (await StopsAPI.Cancel(cancels)) ?? [[], []];
    const queued = await States.Key<IRequestState>({ status: "Queued" });

    const submissions = await Promise.all(
      processed.map(async (hold) => {
        return await Submit({
          stop_request: hold.stop_request,
          state: queued,
          memo: `[Info] Trades.Hold: Modified stop request successfully resubmitted`,
          update_time: new Date(),
        });
      })
    );

    return {
      size: holds.length,
      processed: processed.length,
      accepted: submissions.filter((s) => s).length,
      errors: errors.length,
      rejected: submissions.filter((s) => !s).length,
    };
  } else return { size: 0, processed: 0, accepted: 0, errors: 0, rejected: 0 };
};
