//+--------------------------------------------------------------------------------------+
//|                                                                 [api]  stopOrders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRequestState, TPositionState } from "#db/interfaces/state";
import type { IPublishResult } from "#api";
import type { TRefKey, IStopOrder } from "#db";

import { Session, setSession } from "#module/session";
import { hexify } from "#lib/crypto.util";
import { delay, fileWrite, format } from "#lib/std.util";
import { API_GET, ApiError, ApiResult } from "#api";

import { Reference, InstrumentPosition, StopOrder, StopRequest } from "#db";

export interface IStopOrderAPI {
  account: Uint8Array;
  stop_request: Uint8Array;
  status: TRequestState;
  position_status: TPositionState;
  tpslId: string;
  instId: string;
  positionSide: "short" | "long" | "net";
  marginMode: "cross" | "isolated";
  side: "buy" | "sell";
  size: string;
  state: string;
  tpTriggerPrice: string;
  tpOrderPrice: string;
  slTriggerPrice: string;
  slOrderPrice: string;
  orderCategory: string;
  priceType: string;
  leverage: string;
  actualSize: string;
  reduceOnly: string;
  clientOrderId: string;
  brokerId: string;
  memo: string;
  createTime: string;
  update_time: Date;
}

/**
 * Stops.Publish: Flattens TP/SL pairs into normalized, parallel IPublishResult streams.
 */
const Publish = async (source: string, props: Array<Partial<IStopOrderAPI>>): Promise<Array<IPublishResult<IStopOrder>>> => {
  if (!props?.length) return [];
  const context = `Stops.Import.${source}.Publish`;
  console.log(`-> ${context}`);

  // Build de-duplication map to pre-filter latest orders
  const orders = new Map<string, Partial<IStopOrderAPI>>();
  for (const order of props) {
    const key = order.clientOrderId ? (order.clientOrderId.startsWith("0x") ? order.clientOrderId : `0x${order.clientOrderId}`) : order.tpslId || "0";
    const existing = orders.get(key);
    if (!existing || BigInt(order.tpslId || "0") > BigInt(existing.tpslId || "0")) {
      orders.set(order.tpslId!, order);
    }
  }

  // 3. Process all normalized stops in parallel
  const results = await Promise.all(
    props.map(async (order): Promise<Array<IPublishResult<IStopOrder>>> => {
      try {
        const client_order_id = hexify(order.clientOrderId!, 5);
        const tpsl_id = hexify(parseInt(order.tpslId!), 5);
        const stop_request = client_order_id || tpsl_id;

        // Parallel Reference Lookups
        const [required, order_category, order_states] = await Promise.all([
          InstrumentPosition.Fetch({ account: Session().account, symbol: order.instId, position: order.positionSide }),
          Reference.Key<TRefKey>({ source_ref: order.orderCategory || "normal" }, { table: `order_category` }),
          Reference.Fetch({ source_ref: order.state }, { table: `vw_order_states` }),
        ]);

        if (!tpsl_id || !stop_request) throw new ApiError(455, `Malformed stop request; order rejected`);
        if (!required) throw new ApiError(452, `Invalid instrument position for ${order.tpslId}; stop order rejected`);
        if (!order_states) throw new ApiError(453, `Invalid Order State metadata; unable to resolve state [${order.state}] on Order: ${order.tpslId}`);

        // Determine State Logic (Zombie Protection)
        const [{ instrument_position, auto_status }] = required;
        const [mapped] = order_states;
        const pending = mapped.status === "Pending";
        const auto = auto_status === "Enabled";
        const history = source === "History";

        const revised: Partial<IStopOrder> = {
          tpsl_id,
          client_order_id,
          stop_request,
          instrument_position,
          state: mapped.state,
          order_state: mapped.order_state,
          order_category,
          margin_mode: order.marginMode || Session().margin_mode,
          price_type: order.priceType,
          //          trigger_type: order.triggerType,
          action: order.side,
          size: format(order.size!),
          tp_trigger_price: format(order.tpTriggerPrice!),
          tp_order_price: format(order.tpOrderPrice!),
          sl_trigger_price: format(order.slTriggerPrice!),
          sl_order_price: format(order.slOrderPrice!),
          leverage: parseInt(order.leverage!),
          actual_size: format(order.actualSize!),
          memo:
            source === `History`
              ? "[Info] Orders.Publish: History updated; order imported"
              : "[Info] Orders.Publish: New Order received; submitted and processed",
          reduce_only: order.reduceOnly === "true",
          broker_id: order.brokerId,
          create_time: new Date(parseInt(order.createTime!)),
          update_time: new Date(parseInt(order.createTime!)),
        };

        const [orderResult, request] = await Promise.all([StopOrder.Publish(revised), StopOrder.Fetch({ stop_request })]);
        const [current] = request ?? [{}];
        const key = order.tpslId || "";

        let requestResult: Array<IPublishResult<IStopOrder>> | undefined;

        if (orders.get(key)?.tpslId === order.tpslId) {
          if (history) {
            revised.status = order.state === "effective" || order.state === "live" ? "Expired" : mapped.status;
          } else if (auto) {
            revised.tp_order_price = current.tp_order_price;
            revised.tp_trigger_price = current.tp_trigger_price;
            revised.sl_order_price = current.sl_order_price;
            revised.sl_trigger_price = current.sl_trigger_price;
            revised.size = current.size;
            revised.status = pending ? "Hold" : mapped.status;
          } else revised.status = mapped.status;

          requestResult = await StopRequest.Publish(source, current, revised);
        }

        return requestResult ? [orderResult, ...requestResult].flat() : [orderResult];
      } catch (error) {
        //        console.log(`-> [Error] Stop.Orders.Publish.${source}`, error);
        const errBody: IPublishResult<IStopOrder> =
          error instanceof ApiError
            ? {
                key: undefined,
                response: { success: false, code: error.code, state: `error`, message: error.message, rows: 0, context },
              }
            : {
                key: undefined,
                response: {
                  success: false,
                  code: -1,
                  state: `error`,
                  message: "Network or System failure",
                  rows: 0,
                  context,
                },
              };

        return [errBody];
      }
    }),
  );

  return results.flat();
};

/**
 * Fetches history recursively until no more data is found or limit is reached
 */
const History = async (): Promise<Array<Partial<IStopOrderAPI>>> => {
  const limit = Session().orders_max_fetch || 20;
  const history: Array<Partial<IStopOrderAPI>> = [];

  while (true) {
    console.error("-> [Info] Fetching Stops History from ID:", Session().audit_stops);
    const path = `/api/v1/trade/orders-tpsl-history?before=${Session().audit_stops}&limit=${limit}`;
    const result = await API_GET<Array<Partial<IStopOrderAPI>>>(path, "Stop.Order.History.API");

    if (result && result.length > 0) {
      history.push(...result);
      setSession({ audit_stops: Math.max(...result.map((api) => parseInt(api.tpslId!))).toString() });
    } else break;

    await delay(1500);
  }

  history.length && console.log(`-> [Info] Stops.History: fetched ${history.length} records from API`);
  //  fileWrite<Partial<IStopsAPI>>(`log/stops_history_${new Date().toISOString()}.csv`, history);
  return history;
};

/**
 * Pending - retrieves all active orders, paginating if count > Session().orders_max_fetch;
 */
const Pending = async (): Promise<Array<Partial<IStopOrderAPI>>> => {
  const pending: Array<Partial<IStopOrderAPI>> = [];
  const limit = Session().orders_max_fetch || 20;

  let afterId = "0";

  while (true) {
    const path = `/api/v1/trade/orders-tpsl-pending?before=${afterId}&limit=${limit}`;

    try {
      const result = await API_GET<Array<Partial<IStopOrderAPI>>>(path, "Stop.Order.Pending.API");
      if (result && result.length > 0) {
        pending.push(...result);
        afterId = Math.max(...result.map((o) => parseInt(o.tpslId!))).toString();
      } else break;

      await delay(1500);
    } catch (error) {
      console.error(">> [Error] Stops.Pending: multi-fetch failure from API:", error instanceof Error ? error.message : error);
      break;
    }
  }

  return pending;
};

/**
 * Completes full audit of broker Stops (aka TPSL) API data, loads missing, updates existing
 */
export const oldImport = async () => {
  console.log("In Stops.Import [API]");
  const context = `Stops.Import`;

  try {
    const [history, pending] = await Promise.all([History(), Pending()]);
    const result: Array<IPublishResult<IStopOrder>> = [];

    if (history.length > 0) {
      const historyResult = await Publish("History", history);
      result.push({
        key: undefined,
        response: {
          success: history.length ? true : false,
          code: 203,
          state: `total`,
          rows: history.length,
          context: `${context}.History`,
          message: history.length ? "[Info] History retrieval successful" : "[Warning] No history retrieved",
        },
        ...historyResult,
      });
    }

    if (pending.length > 0) {
      const pendingResult = await Publish("Pending", pending);
      result.push({
        key: undefined,
        response: {
          success: pending.length ? true : false,
          code: 203,
          state: `total`,
          rows: history.length,
          context: `${context}.Pending`,
          message: history.length ? "[Info] Pending retrieval successful" : "[Info] No pending retrieved",
        },
      });
      result.push(...pendingResult);
    }

    // console.log(`-> Stops.Import complete; history stops processed: ${history.length}; open stops processed: ${pending.length};`);
    return result;
  } catch (error) {
    console.error(">> [Error] Stops.Import: Operation failure", error);
  }
};

export const Import = async () => {
  const context = `Stops.Import`;

  try {
    const [history, pending] = await Promise.all([History(), Pending()]);

    // Process results into a flat array
    const results = await Promise.all([history.length ? Publish("History", history) : [], pending.length ? Publish("Pending", pending) : []]);

    // Construct the final array using the factory
    return [ApiResult(`${context}.History`, history, 203), ...results[0], ApiResult(`${context}.Pending`, pending, 203), ...results[1]].flat();
  } catch (error) {
    // Standardized Error Response Factory
    return [ApiResult(`${context}.Error`, [], -1)];
  }
};
