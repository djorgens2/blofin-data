//+--------------------------------------------------------------------------------------+
//|                                                               [requests] canceled.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, TResponse, IOrderAPI } from "#api";
import type { IOrder, IRequest } from "#db";

import { Order, Request } from "#db";
import { Requests} from "#api";
import { Session } from "#module/session";

import { hexString } from "#lib/std.util";

//-- [Process.Orders] Submit Cancel requests to the API for orders in canceled state
type Accumulator = { cancel: Partial<IOrderAPI>[]; closure: Partial<IOrder>[] };

export const Canceled = async (): Promise<Array<IPublishResult<IRequest>>> => {
  const orders = await Order.Fetch({ status: "Canceled", account: Session().account });

  if (!orders) return [];
  console.log(`-> Requests.Canceled: Processing ${orders.length} canceled orders`);

  const { cancel, closure } = orders.reduce(
    (acc: Accumulator, order) => {
      const orderId = parseInt(hexString(order.order_id!, 10)).toString();
      const isPending = order.order_id && order.request_status === "Pending";
      isPending ? acc.cancel.push({ instId: order.symbol, orderId }) : acc.closure.push(order);
      return acc;
    },
    { cancel: [] as IOrderAPI[], closure: [] as IOrder[] },
  );

  const promises = [
    ...closure.map(async (request) => {
      const result = await Request.Submit({ ...request, update_time: new Date() });
      result.response.state = "closed";
      return result;
    }),

    (async () => {
      if (cancel.length === 0) return [];
      const cancels = await Requests.Cancel(cancel);

      return cancels.map((c) => ({
        ...c,
        response: { ...c.response, outcome: "expired" } as TResponse,
      }));
    })(),
  ];

  const results = await Promise.all(promises);
  return results.flat();
};
