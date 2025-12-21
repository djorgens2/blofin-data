//+--------------------------------------------------------------------------------------+
//|                                                               [requests] canceled.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { hexString } from "lib/std.util";
import { Session } from "module/session";

import * as OrderAPI from "api/orders";
import * as Orders from "db/interfaces/order";

//-- [Process.Orders] Submit Cancel requests to the API for orders in canceled state
export const Canceled = async () => {
  const orders = await Orders.Fetch({ status: "Canceled", account: Session().account });

  if (orders) {
    const cancels = [];
    const closed = [];

    for (const order of orders) {
      const orderId = BigInt(hexString(order.order_id!, 10)).toString();
      order.order_id && order.request_status === "Pending" ? cancels.push({ instId: order.symbol, orderId }) : closed.push(order);
    }

    const [accepted, rejected] = (await OrderAPI.Cancel(cancels)) ?? [[], []];

    if (cancels.length) {
      console.log(">> Trades.Canceled: Cancel requests submitted:", cancels.length);
      accepted.length && console.log("   # [Info] Canceled requests accepted:", accepted.length);
      rejected.length && console.log("   # [Error] Canceled requests rejected:", rejected.length);
      closed.length && console.log("   # [Warning] Canceled requests previously closed (???):", closed.length);
    }
  }
};
