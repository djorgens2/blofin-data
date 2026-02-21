//+--------------------------------------------------------------------------------------+
//|                                                                     [api]  orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRefKey, IOrder, IRequest } from "#db";
import type { IPublishResult, IRequestAPI } from "#api";

import { Session, setSession } from "#module/session";
import { API_GET, ApiError, isApiError } from "#api";
import { delay, format, hexString } from "#lib/std.util";
import { hexify } from "#lib/crypto.util";

import { Request, Order, Reference, InstrumentPosition } from "#db";

export interface IOrderAPI extends IRequestAPI {
  instType: string;
  orderId: string;
  filledSize: string;
  filledAmount: string;
  averagePrice: string;
  state: string;
  fee: string;
  pnl: string;
  cancelSource: string;
  orderCategory: string;
  algoClientOrderId?: string;
  algoId?: string;
  filled_amount?: string;
}

/**
 * Orders.Publish: Flattens Merges changes received by API/WSS; returns parallel IPublishResult streams.
 */
export const Publish = async (source: string, props: Array<Partial<IOrderAPI>>, context = "Order"): Promise<Array<IPublishResult<IOrder>>> => {
  context = `${source}.${context}.Publish`;
  
  if (!props?.length) return [];
  console.log(`-> Orders.Publish.${source}`);

  // 1. PRE-FILTER (de-dup map): Identify the latest order for each unique Request ID
  const requests = new Map<string, { order: Partial<IOrderAPI>; key: string }>();
  for (const order of props) {
    const order_id = hexify(parseInt(order.orderId!).toString(16), 6);
    const key = hexString(hexify(order.clientOrderId || order_id!, 6)!, 12);
    const current = requests.get(key);

    if (!current || parseInt(order.updateTime!) > parseInt(current.order.updateTime!)) {
      requests.set(key, { order, key });
    }
  }

  const results = await Promise.all(
    props.map(async (order) => {
      try {
        const order_id = hexify(parseInt(order.orderId!).toString(16), 6);
        const request = hexify(order.clientOrderId || order_id!, 6)!;

        if (!order_id || !request) throw new ApiError(451, `Invalid Order ID ${order.orderId} or Request ${order.clientOrderId}; order not processed`);

        const [required, cancel_source, order_category, request_type, order_states] = await Promise.all([
          InstrumentPosition.Fetch({ account: Session().account, symbol: order.instId, position: order.positionSide }),
          Reference.Key<TRefKey>({ source_ref: order.cancelSource || "not_canceled" }, { table: `cancel_source` }),
          Reference.Key<TRefKey>({ source_ref: order.orderCategory || "normal" }, { table: `order_category` }),
          Reference.Key<TRefKey>({ source_ref: order.orderType }, { table: `request_type` }),
          Reference.Fetch({ source_ref: order.state }, { table: `vw_order_states` }),
        ]);

        if (!required)
          throw new ApiError(452, `Unauthorized Instrument Position [${order.instId}:${order.positionSide}] request from logged account ${Session().alias}`);

        if (!order_states) throw new ApiError(453, `Invalid Order State metadata; unable to resolve state [${order.state}}] on Order: ${request}`);

        const [mapped] = order_states;

        const orderResult = await Order.Publish({
          order_id,
          client_order_id: hexify(order.clientOrderId!, 6),
          order_state: mapped.order_state,
          order_category,
          cancel_source,
          filled_size: format(order.filledSize!),
          filled_amount: format(order.filledAmount ?? order.filled_amount ?? "0"),
          average_price: format(order.averagePrice!),
          fee: format(order.fee!),
          pnl: format(order.pnl!),
        });

        const [{ instrument_position, auto_status }] = required;
        const [current] = (await Order.Fetch({ request })) ?? [{}];
        const key = hexString(request, 12);

        const create_time = new Date(parseInt(order.createTime!));
        const update_time = new Date(parseInt(order.updateTime!));

        const pending = mapped.status === "Pending";
        const auto = auto_status === "Enabled";
        const history = source === "History";

        let requestResult: IPublishResult<IOrder> | undefined;
        let revised: Partial<IRequest> = {
          request,
          instrument_position,
          action: order.side,
          state: mapped.state,
          price: format(order.price!),
          size: format(order.size!),
          leverage: format(order.leverage!),
          request_type,
          margin_mode: order.marginMode || Session().margin_mode || `cross`,
          reduce_only: order.reduceOnly === "true",
          memo:
            source === "WSS"
              ? current.memo || `[Info] Orders.Publish: WSS message received; order updated`
              : source === `History`
                ? "[Info] Orders.Publish: History updated; order imported"
                : "[Info] Orders.Publish: New Order received; submitted and processed",
          broker_id: order.brokerId,
          create_time,
          update_time,
        };

        if (requests.get(key)?.order.orderId === order.orderId) {
          if (history) {
            revised.status = mapped.status === "Pending" ? "Expired" : mapped.status;
          } else if (auto) {
            revised.price = current.price;
            revised.size = current.size;
            revised.leverage = current.leverage;
            revised.status = pending ? "Hold" : mapped.status;
          } else revised.status = mapped.status;

          requestResult = await Request.Publish(source, current, revised);
        }

        return requestResult ? [orderResult, requestResult] : [orderResult];
      } catch (error) {
        //          console.log(`-> [Error] Orders.Publish.${source}`, error);
        const errorBody: IPublishResult<IOrder> =
          error instanceof ApiError
            ? {
                key: undefined,
                response: { success: false, code: error.code, state: `error`, message: error.message, rows: 0, context },
              }
            : {
                key: undefined,
                response: { success: false, code: -1, state: `error`, message: "Network or System failure", rows: 0, context },
              };
        return [errorBody];
      }
    }),
  );
  return results.flat();
};

/**
 * Pending - retrieves all active orders, paginating if count > 100
 */
export const Pending = async (): Promise<Array<Partial<IOrderAPI>>> => {
  const pending: Array<Partial<IOrderAPI>> = [];
  const limit = Session().orders_max_fetch || 20;

  let afterId = "0";

  while (true) {
    const path = `/api/v1/trade/orders-pending?after=${afterId}&limit=${limit}`;

    try {
      const result = await API_GET<Array<Partial<IOrderAPI>>>(path, "Order.Pending");

      if (result && result.length > 0) {
        pending.push(...result);
        afterId = Math.max(...result.map((o) => parseInt(o.orderId!))).toString();
      } else break;

      await delay(1500);
    } catch (error) {
      console.error(">> [Error] Order.Pending: multi-fetch failure from API:", error instanceof Error ? error.message : error);
      break;
    }
  }

  return pending;
};

/**
 * Fetches history recursively until no more data is found or limit is reached
 */
const History = async (): Promise<Array<Partial<IOrderAPI>>> => {
  const limit = Session().orders_max_fetch || 20;
  const history: Array<Partial<IOrderAPI>> = [];

  while (true) {
    console.error("-> [Info] Fetching Order History from ID:", Session().audit_order);
    const path = `/api/v1/trade/orders-history?before=${Session().audit_order}&limit=${limit}`;
    const result = await API_GET<Array<Partial<IOrderAPI>>>(path, "Order.History");

    if (result && result.length > 0) {
      history.push(...result);
      setSession({ audit_order: Math.max(...result.map((api) => parseInt(api.orderId!))).toString() });
    } else break;

    await delay(1500);
  }

  return history;
};

/**
 * Completes full audit of broker Order API data, loads missing, updates existing
 */
export const Import = async () => {
  console.log("In Orders.Import [API]");

  try {
    const [history, pending] = await Promise.all([History(), Pending()]);
    const result: Array<IPublishResult<IOrder>> = [];

    if (history.length > 0) {
      const historyResult = await Publish("History", history);
      result.push(...historyResult);
    }
    if (pending.length > 0) {
      const pendingResult = await Publish("Pending", pending);
      result.push(...pendingResult);
    }

    console.log(`-> Orders.Import complete; history orders processed: ${history.length}; open orders processed: ${pending.length};`);
    return result;
  } catch (error) {
    console.error(">> [Error] Orders.Import: Operation failure", error);
  }
};
