/**
 * API Integration and Synchronization for Trade Orders.
 *
 * This module orchestrates the transformation of raw exchange order data into
 * localized Order and Request records. It handles state mapping, currency formatting,
 * and ensures data integrity across high-frequency WSS updates and REST history imports.
 *
 * @module api/orders
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TRefKey, IOrder, IRequest } from "#db";
import type { IPublishResult, IRequestAPI } from "#api";

import { Session, setSession } from "#module/session";
import { API_GET, ApiError } from "#api";
import { delay, format, hexString } from "#lib/std.util";
import { hexify } from "#lib/crypto.util";

import { Request, Order, Reference, InstrumentPosition } from "#db";

/**
 * Extended Order data structure from the Broker API.
 * Includes execution details such as filled size, fees, and PnL.
 */
export interface IOrderAPI extends IRequestAPI {
  instType: string;
  orderId: string;
  filledSize: string;
  filledAmount: string;
  averagePrice: string;
  /** Current state string from the exchange (e.g., "live", "filled"). */
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
 * Transforms and persists order updates from API or WSS sources.
 * 
 * Execution Logic:
 * 1. **De-duplication**: Filters the batch to ensure only the most recent update 
 *    (by `updateTime`) per `clientOrderId` is processed.
 * 2. **Metadata Resolution**: Concurrently fetches Foreign Keys for `cancel_source`, 
 *    `order_category`, `request_type`, and `order_state`.
 * 3. **Validation**: Verifies that the instrument position is authorized for the current session.
 * 4. **Order Sync**: Updates the `Order` table with execution metrics (fills, fees, PnL).
 * 5. **Request Sync**: Updates the parent `Request` status based on the `source` (WSS vs History) 
 *    and automation settings.
 * 
 * @param source - Origin of the data: "WSS", "History", or "API".
 * @param props - Array of raw order data objects from the exchange.
 * @param context - Tracing context for logging.
 * @returns A promise resolving to a flattened array of results for both Order and Request updates.
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
 * Retrieves all currently active/pending orders from the exchange.
 * 
 * Implements a recursive pagination strategy:
 * - Fetches orders in batches defined by `Session.config.orders_max_fetch`.
 * - Uses the `after` parameter to seek beyond the highest `orderId` received.
 * - Includes a 1500ms delay between cycles to respect broker rate limits.
 * 
 * @returns A promise resolving to a complete list of pending orders from the API.
 */
export const Pending = async (): Promise<Array<Partial<IOrderAPI>>> => {
  const pending: Array<Partial<IOrderAPI>> = [];
  const limit = Session().config?.orders_max_fetch || 20;

  let afterId = "0";

  while (true) {
    const path = `/api/v1/trade/orders-pending?after=${afterId}&limit=${limit}`;

    try {
      const { success, data } = await API_GET<Array<Partial<IOrderAPI>>>(path, "Order.Pending");

      if (success && data && data.length > 0) {
        pending.push(...data);
        afterId = Math.max(...data.map((o) => parseInt(o.orderId!))).toString();
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
 * Private helper to recursively fetch historical order data from the exchange.
 * 
 * Logic Flow:
 * 1. Queries the `/api/v1/trade/orders-history` endpoint.
 * 2. Uses `Session.audit_order` as the starting pointer (`before` parameter) to resume 
 *    syncing from the last known synchronized ID.
 * 3. Updates the `Session` with the highest `orderId` found in each batch to move 
 *    the audit pointer forward.
 * 4. Implements a 1500ms delay between recursive calls to adhere to broker rate limits.
 * 
 * @returns A promise resolving to a flattened array of historical order data.
 */
const History = async (): Promise<Array<Partial<IOrderAPI>>> => {
  const limit = Session().config?.orders_max_fetch || 20;
  const history: Array<Partial<IOrderAPI>> = [];

  while (true) {
    console.error("-> [Info] Fetching Order History from ID:", Session().audit_order);
    const path = `/api/v1/trade/orders-history?before=${Session().audit_order}&limit=${limit}`;
    const { success, data } = await API_GET<Array<Partial<IOrderAPI>>>(path, "Order.History");

    if (success && data && data.length > 0) {
      history.push(...data);
      setSession({ audit_order: Math.max(...data.map((api) => parseInt(api.orderId!))).toString() });
    } else break;

    await delay(1500);
  }

  return history;
};

/**
 * Executes a comprehensive audit and synchronization of all order data from the broker.
 * 
 * This is the main orchestration method for order synchronization. It performs 
 * the following in parallel:
 * - **History Sync**: Pulls past orders using {@link History} and updates the local 
 *   database with the "History" source flag.
 * - **Pending Sync**: Pulls current active orders using {@link Pending} and updates 
 *   the local database with the "Pending" source flag.
 * 
 * The method reconciles both datasets through {@link Publish} to ensure the local 
 * database accurately reflects both the ledger of past trades and current open exposure.
 * 
 * @returns A promise resolving to an aggregated collection of {@link IPublishResult} 
 *          objects for every record processed.
 * @throws Logs a system error and returns undefined if the parallel fetch operations fail.
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
