//+--------------------------------------------------------------------------------------+
//|                                                                 [stops]  canceled.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, IStopOrderAPI } from "#api";
import type { IStopRequest } from "#db";

import { hexString } from "#lib/std.util";
import { Session } from "#module/session";

import { StopRequests } from "#api";
import { StopOrder, StopRequest } from "#db";

//+----------------------------------------------------------------------------------------+
//| [Process.Stops] Submit Cancel requests to the API for orders in canceled state;        |
//+----------------------------------------------------------------------------------------+
type Accumulator = { cancels: Partial<IStopOrderAPI>[]; closures: Partial<IStopRequest>[] };

export const Canceled = async (): Promise<Array<IPublishResult<IStopRequest>>> => {
  const orders = await StopOrder.Fetch({ status: "Canceled", account: Session().account });

  if (!orders) return [];
  console.log(`-> Requests.Canceled: Processing ${orders.length} canceled orders`);

  const { cancels, closures } = orders.reduce(
    (acc: Accumulator, request) => {
      const instId = request.symbol;
      const tpslId = parseInt(hexString(request.tpsl_id!, 10)).toString(10);
      const isPending = request.request_status === "Pending";
      isPending ? cancels.push({ tpslId, instId }) : closures.push({ stop_request: request.stop_request });
      return acc;
    },
    { cancels: [] as IStopOrderAPI[], closures: [] as IStopRequest[] },
  );

  const promises = [
    ...closures.map(async (request) => {
      const result = await StopRequest.Submit({ ...request, update_time: new Date() });
      result.response.state = "closed";
      return result;
    }),

    (async () => {
      if (cancels.length === 0) return [];
      const results = await StopRequests.Cancel(cancels);

      return results.map((cancel) => ({
        ...cancel,
        response: { ...cancel.response, state: "expired" },
      }));
    })(),
  ];

  const results = await Promise.all(promises);
  return results.flat();
};
