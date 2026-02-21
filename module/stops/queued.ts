//+--------------------------------------------------------------------------------------+
//|                                                                   [stops]  Queued.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IStopOrderAPI } from "#api";

import { ApiError } from "#api";
import { hexString } from "#lib/std.util";

import { StopRequests, StopOrders } from "#api";
import { StopOrder } from "#db";

//+----------------------------------------------------------------------------------------+
//| Handle processing related to Queued stops; TP/SL;                                      |
//+----------------------------------------------------------------------------------------+
export const Queued = async () => {
  const requests = await StopOrder.API(`Queued`);

  if (!requests || requests.length === 0) return [];
  console.log(`-> Stop.Requests.Queued: Processing ${requests.length} stop requests`);

  const queuePromises = requests.map(async (request) => {
    try {
      if (!request.clientOrderId && !request.stop_request) {
        throw new ApiError(400, "Missing Client Order ID");
      }

      // 1. Singleton/Zombie Guard: If position is already closed, kill the request
      if (request.position_status === "Closed") {
        return await StopRequests.Submit({
          stop_request: request.stop_request,
          status: "Closed",
          memo: `[Info]: Queued request on closed position; local state Closed`,
        });
      }

      // 2. Map View data to API Interface
      // Use the 'request' value to decide if we populate the 'api' field
      const api: Partial<IStopOrderAPI> = {
        instId: request.instId,
        marginMode: request.marginMode,
        positionSide: request.positionSide,
        side: request.side,
        size: request.size,
        clientOrderId: request.clientOrderId || hexString(request.stop_request!, 10),
        brokerId: request.brokerId || "",
        // Handle logic for Reduce Only / Hedge Mode
        reduceOnly: request.reduceOnly?.toLowerCase() === "true" ? "true" : "false",
      };

      if (request.tpTriggerPrice) api.tpTriggerPrice = request.tpTriggerPrice;
      if (request.tpOrderPrice) api.tpOrderPrice = request.tpOrderPrice;
      if (request.slTriggerPrice) api.slTriggerPrice = request.slTriggerPrice;
      if (request.slOrderPrice) api.slOrderPrice = request.slOrderPrice;

      // 3. Fire to Broker
      return await StopRequests.Submit(api);
    } catch (error) {
      console.error(`-> [Error] Stop.Order.Queue:`, error);
      return [
        {
          key: undefined,
          response: {
            success: false,
            code: error instanceof ApiError ? error.code : -1,
            state: `error`,
            message: error instanceof Error ? error.message : "System failure",
            rows: 0,
            context: `Stop.Order.Queue`,
          },
        },
      ];
    }
  });

  const results = await Promise.all(queuePromises);
  return results.flat();
};
