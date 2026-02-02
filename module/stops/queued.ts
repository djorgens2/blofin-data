//+--------------------------------------------------------------------------------------+
//|                                                                   [stops]  Queued.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopsAPI } from "api/stops";
import type { IRequestState } from "db/interfaces/state";

import { format } from "lib/std.util";
import { hexify } from "lib/crypto.util";
import { Session } from "module/session";
import { Select, Update } from "db/query.utils";
import { Submit } from "db/interfaces/stop_request";

import * as StopsAPI from "api/stops";
import * as StopRequest from "db/interfaces/stops";
import * as States from "db/interfaces/state";
import * as InstrumentPosition from "db/interfaces/instrument_position";

//------------------ Private functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| handles the submit processing for TP/SL requests                                     |
//+--------------------------------------------------------------------------------------+
const handleSubmits = async (requests: Partial<IStopsAPI>[]) => {
  if (requests.length) {
    const results = await Promise.all(requests.map((q) => StopsAPI.Submit(q)));
    return {
      success: results.filter((r) => r?.[0]?.length).length,
      rejected: results.filter((r) => r?.[1]?.length).length,
    };
  } else return { success: 0, rejected: 0 };
};

//+--------------------------------------------------------------------------------------+
//| handles the verification and revalidation of existing TP/SL requests                 |
//+--------------------------------------------------------------------------------------+
const handleVerifications = async (requests: Partial<IStopsAPI>[]) => {
  if (requests.length) {
    const expired = await States.Key<IRequestState>({ status: "Expired" });

    const results = await Promise.all(
      requests.map(async (v) => {
        const [pos] =
          (await InstrumentPosition.Fetch({
            symbol: v.instId,
            position: v.positionSide,
            account: Session().account,
          })) ?? [];

        if (pos?.open_request) {
          const success = await Submit({
            stop_request: hexify(v.clientOrderId!, 5),
            instrument_position: pos.instrument_position,
            trigger_price: format(v.tpTriggerPrice ?? v.slTriggerPrice!),
            order_price: format(v.tpOrderPrice ?? v.slOrderPrice!),
            size: format(v.size!),
            reduce_only: v.reduceOnly === "true",
            broker_id: v.brokerId ?? undefined,
            update_time: new Date(),
          });
          return success ? "processed" : "error";
        }

        await Update(
          {
            stop_request: hexify(v.clientOrderId!, 5),
            state: expired,
            memo: `[Info] Trades.Queued: Stop order on closed position; Expired`,
            update_time: new Date(),
          },
          { table: `stop_request`, keys: [{ key: `stop_request` }] },
        );

        return "expired";
      }),
    );

    return {
      processed: results.filter((r) => r === "processed").length,
      expired: results.filter((r) => r === "expired").length,
    };
  } else return { processed: 0, expired: 0 };
};

//+--------------------------------------------------------------------------------------+
//| handles error processing for existing TP/SL requests; case by case anylysis continues|
//+--------------------------------------------------------------------------------------+
const handleErrors = async (errors: Partial<IStopsAPI>[]) => {
  return errors.length;
};

//------------------ Private functions ---------------------//

//+----------------------------------------------------------------------------------------+
//| Handle processing related to Queued stops; TP/SL;                                      |
//+----------------------------------------------------------------------------------------+
type Accumulator = { queued: Partial<IStopsAPI>[]; verify: Partial<IStopsAPI>[]; error: Partial<IStopsAPI>[] };

export const Queued = async () => {
  const requests = await Select<IStopsAPI>({ status: "Queued", account: Session().account }, { table: `vw_api_stop_requests` });

  if (requests.length) {
    const { queued, verify, error } = requests.reduce(
      (acc: Accumulator, request) => {
        if (request.tpslId) acc.error.push(request);
        else if (request.position_status === "Open") acc.queued.push(request);
        else acc.verify.push(request);
        return acc;
      },
      { queued: [] as IStopsAPI[], verify: [] as IStopsAPI[], error: [] as IStopsAPI[] },
    );

    const [submitted, verified, errors] = await Promise.all([handleSubmits(queued), handleVerifications(verify), handleErrors(error)]);

    return { total: requests.length, submitted, verified, errors };
  } else return { total: 0, submitted: { success: 0, rejected: 0 }, verified: { processed: 0, expired: 0 }, errors: 0 };
};
