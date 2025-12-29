//+--------------------------------------------------------------------------------------+
//|                                                               [requests] canceled.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { IOrderAPI } from "api/orders";
import { IOrder } from "db/interfaces/order";

import { hexString } from "lib/std.util";
import { Session } from "module/session";

import * as RequestAPI from "api/requests";
import * as Orders from "db/interfaces/order";
import * as Requests from "db/interfaces/request";

//-- [Process.Orders] Submit Cancel requests to the API for orders in canceled state
type Accumulator = { cancels: Partial<IOrderAPI>[]; closures: Partial<IOrder>[] };

export const Canceled = async () => {
  const orders = await Orders.Fetch({ status: "Canceled", account: Session().account });

  if (orders) {
    const { cancels, closures } = orders.reduce(
      (acc: Accumulator, order) => {
        const orderId = BigInt(hexString(order.order_id!, 10)).toString();
        const isPending = order.order_id && order.request_status === "Pending";
        isPending ? acc.cancels.push({ instId: order.symbol, orderId }) : acc.closures.push(order);
        return acc;
      },
      { cancels: [] as IOrderAPI[], closures: [] as IOrder[] }
    );

    const [canceled, closed] = await Promise.all([
      RequestAPI.Cancel(cancels) ?? { size: 0, accepted: 0, rejected: 0 },
      Promise.all(closures.map((c) => Requests.Cancel(c))) ?? { size: 0, accepted: 0, rejected: 0 },
    ]);
    return {
      total: orders.length, canceled, closed: closed.length }
  }
};
