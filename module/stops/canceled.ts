//+--------------------------------------------------------------------------------------+
//|                                                                 [stops]  canceled.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopsAPI } from "api/stops";
import type { IPublishResult } from "db/query.utils";
import type { IStopRequest } from "db/interfaces/stop_request";

import { hexString } from "lib/std.util";
import { Session } from "module/session";

import * as StopRequestAPI from "api/stop_requests";
import * as Requests from "db/interfaces/stop_request";
import * as Orders from "db/interfaces/stops";

//+----------------------------------------------------------------------------------------+
//| [Process.Stops] Submit Cancel requests to the API for orders in canceled state;        |
//+----------------------------------------------------------------------------------------+
type Accumulator = { cancels: Partial<IStopsAPI>[]; closures: Partial<IStopRequest>[] };

export const Canceled = async (): Promise<Array<IPublishResult<IStopRequest>>> => {
  const orders = await Orders.Fetch({ status: "Canceled", account: Session().account });

  if (!orders) return [];
  console.log(`-> Requests.Canceled: Processing ${orders.length} canceled orders`);

  const { cancels, closures } = orders.reduce(
    (acc: Accumulator, request) => {
      const instId = request.symbol;
      const tpslId = parseInt(hexString(request.tpsl_id!, 10)).toString(10);
      const isPending = request.request_status === "Pending";
      isPending ? cancels.push({ tpslId, instId}) : closures.push({ stop_request: request.stop_request }) 
      return acc;
    },
    { cancels: [] as IStopsAPI[], closures: [] as IStopRequest[] },
  );

  const promises = [
    ...closures.map(async (request) => {
      const result = await Requests.Submit({ ...request, update_time: new Date() });
      result.response.outcome = "closed";
      return result;
    }),

    (async () => {
      if (cancels.length === 0) return [];
      const results = await StopRequestAPI.Cancel(cancels);

      return results.map((cancel) => ({
        ...cancel,
        response: { ...cancel.response, outcome: "expired" },
      }));
    })(),
  ];

  const results = await Promise.all(promises);
  return results.flat();
};
