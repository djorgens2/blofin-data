//+--------------------------------------------------------------------------------------+
//|                                                                 [stops]  canceled.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopsAPI } from "api/stops";
import type { IRequestState } from "db/interfaces/state";

import { hexify } from "lib/crypto.util";
import { Session } from "module/session";
import { Select, Update } from "db/query.utils";

import * as OrderAPI from "api/stops";
import * as States from "db/interfaces/state";

//------------------ Private functions ---------------------//

const handleClosures = async (requests: Partial<IStopsAPI>[]) => {
  if (requests.length) {
    const closed = await States.Key<IRequestState>({ status: "Closed" });

    const results = await Promise.all(
      requests.map(async (c) => {
        const tpsl_id = hexify(c.clientOrderId!.slice(2), 4);
        const stop_request = {
          tpsl_id,
          state: closed,
          memo: `[Info] Trades.Canceled: Stop order on closed position; state changed to Closed`,
          update_time: new Date(),
        };
        const [result, updates] = await Update(stop_request, { table: `stop_request`, keys: [{ key: `tpsl_id` }] });
        return result ? (updates ? "success" : "confirmed") : "failed";
      })
    );
    return {
      success: results.filter((r) => r === "success").length,
      confirmed: results.filter((r) => r === "confirmed").length,
      failed: results.filter((r) => r === "failed").length,
    };
  }
  return { success: 0, confirmed: 0, failed: 0 };
};

const handleCanceled = async (cancels: Partial<IStopsAPI>[]) => {
  if (cancels.length) {
    const [accepted, rejected] = (await OrderAPI.Cancel(cancels)) ?? [[], []];
    return { accepted: accepted.length, rejected: rejected.length };
  } else return { accepted: 0, rejected: 0 };
};

const handleRejected = async (rejected: Partial<IStopsAPI>[]) => {
  return rejected.length;
};

//------------------ Public functions ---------------------//

//+----------------------------------------------------------------------------------------+
//| [Process.Stops] Submit Cancel requests to the API for orders in canceled state;        |
//+----------------------------------------------------------------------------------------+
type Accumulator = { cancels: Partial<IStopsAPI>[]; closures: Partial<IStopsAPI>[]; rejected: Partial<IStopsAPI>[] };

export const Canceled = async () => {
  const requests = await Select<IStopsAPI>({ status: "Canceled", account: Session().account }, { table: `vw_api_stop_requests` });

  if (requests.length) {
    const { cancels, closures, rejected } = requests.reduce(
      (acc: Accumulator, request) => {
        const { tpslId, instId, clientOrderId } = request;
        request.tpslId ? cancels.push({ tpslId, instId, clientOrderId }) : clientOrderId ? closures.push({ clientOrderId }) : rejected.push(request);
        return acc;
      },
      { cancels: [] as IStopsAPI[], closures: [] as IStopsAPI[], rejected: [] as IStopsAPI[] }
    );

    const [canceled, closed, errors] = await Promise.all([handleCanceled(cancels), handleClosures(closures), handleRejected(rejected)]);
    return { total: requests.length, canceled, closed, errors };
  } else return undefined;
};
