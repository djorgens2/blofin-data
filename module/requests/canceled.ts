//+--------------------------------------------------------------------------------------+
//|                                                               [requests] canceled.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { IPublishResult, TResponse } from "db/query.utils";
import { IOrderAPI } from "api/orders";
import { IOrder } from "db/interfaces/order";
import { IRequest } from "db/interfaces/request";

import { hexString } from "lib/std.util";
import { Session } from "module/session";

import * as RequestAPI from "api/requests";
import * as Orders from "db/interfaces/order";
import * as Requests from "db/interfaces/request";

//-- [Process.Orders] Submit Cancel requests to the API for orders in canceled state
type Accumulator = { cancel: Partial<IOrderAPI>[]; closure: Partial<IOrder>[] };

export const Canceled = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const orders = await Orders.Fetch({ status: "Canceled", account: Session().account });

  if (!orders) return [];

    const { cancel, closure } = orders.reduce(
      (acc: Accumulator, order) => {
        const orderId = BigInt(hexString(order.order_id!, 10)).toString();
        const isPending = order.order_id && order.request_status === "Pending";
        isPending ? acc.cancel.push({ instId: order.symbol, orderId }) : acc.closure.push(order);
        return acc;
      },
      { cancel: [] as IOrderAPI[], closure: [] as IOrder[] }
    );

    const promises = [
      ...closure.map(async (request) => {
        const result = await Requests.Submit({ ...request, update_time: new Date() });
        result.response.outcome = "closed";
        return result;
      }),

      (async () => {
        if (cancel.length === 0) return [];
        const cancels = await RequestAPI.Cancel(cancel);

        return cancels.map((c) => ({
          ...c,
          response: { ...c.response, outcome: "expired" } as TResponse,
        }));
      })(),
    ];

    const results = await Promise.all(promises);
    return results.flat();
  }

