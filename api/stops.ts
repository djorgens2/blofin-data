//+--------------------------------------------------------------------------------------+
//|                                                                      [api]  stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRequestState } from "db/interfaces/state";
import type { TPositionState } from "db/interfaces/state";
import type { IStopOrder } from "db/interfaces/stops";
import type { TRefKey } from "db/interfaces/reference";
import type { IPublishResult } from "db/query.utils";

import { Session, setSession, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { delay, fileWrite, format, hexString, isEqual } from "lib/std.util";
import { API_GET, ApiError } from "api/api.util";

import * as Stops from "db/interfaces/stops";
import * as StopRequests from "db/interfaces/stop_request";
import * as Reference from "db/interfaces/reference";
import * as InstrumentPositions from "db/interfaces/instrument_position";

export interface IStopsAPI {
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
export const Publish = async (source: string, props: Array<Partial<IStopsAPI>>): Promise<Array<IPublishResult<IStopOrder>>> => {
  if (!props?.length) return [];
  console.log(`-> Stop.Orders.Publish.${source}`);

  const types = await Stops.Types(["tp", "sl"]);
  const typeMap = new Map(types.map((t) => [t.source_ref, t]));

  const tp = typeMap.get("tp");
  const sl = typeMap.get("sl");

  if (!tp || !sl) {
    throw new ApiError(602, `Invalid stop type references requoired for TPSL publishing`);
  }

  // Build de-duplication map to pre-filter latest orders
  const orders = new Map<string, Partial<IStopsAPI>>();
  for (const order of props) {
    const existing = orders.get(order.tpslId!);
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
        const stop_request = hexify(order.clientOrderId && order.clientOrderId.length > 2 ? order.clientOrderId : parseInt(order.tpslId!).toString(16), 5);

        
        // Parallel Reference Lookups
        const [required, order_category, order_states] = await Promise.all([
          InstrumentPositions.Fetch({ account: Session().account, symbol: order.instId, position: order.positionSide }),
          Reference.Key<TRefKey>({ source_ref: order.orderCategory || "normal" }, { table: `order_category` }),
          Reference.Fetch({ source_ref: order.state }, { table: `vw_order_states` }),
        ]);
        
        if (!tpsl_id || !stop_request) throw new ApiError(455, `Malformed stop request; order rejected`);
        if (!required) throw new ApiError(452, `Invalid instrument position for ${order.tpslId}; stop order rejected`);
        if (!order_states) throw new ApiError(453, `Invalid Order State metadata; unable to resolve state [${order.state}] on Order: ${order.tpslId}`);

        //   const tp_price = (order.tpTriggerPrice ?? order.tpOrderPrice) != null ? true : false;
        //   const sl_price = (order.slTriggerPrice ?? order.slOrderPrice) != null ? true : false;

        //   const orders = [];
        //   const stop_price = [];

        //   orders.push({...order, stop_request});

        //   tp_price &&
        //     stop_price.push({
        //       stop_request,
        //       stop_type: tp.stop_type,
        //       trigger_price: format(order.tpTriggerPrice || -1),
        //       order_price: format(order.tpOrderPrice || -1),
        //     });

        //     sl_price &&
        //     stop_price.push({
        //       stop_request,
        //       stop_type: sl.stop_type,
        //       trigger_price: format(order.slTriggerPrice || -1),
        //       order_price: format(order.slOrderPrice || -1),
        //     });

        //   return [orders, stop_price];
        // });
        // Determine State Logic (Zombie Protection)
        const [mapped] = order_states;
        const [{ instrument_position, auto_status }] = required;

        const request: Partial<IStopOrder> = {
          tpsl_id,
          client_order_id,
          instrument_position,
          margin_mode: order.marginMode || Session().margin_mode || `cross`,
          state: mapped.state,
          order_state: mapped.order_state,
          order_category,
          action: order.side,
          size: format(order.size!),
          leverage: parseInt(order.leverage!),
          actual_size: format(order.actualSize!),
          memo:
          source === `History`
          ? "[Info] Orders.Publish: History updated; order imported"
          : "[Info] Orders.Publish: New Order received; submitted and processed",
          reduce_only: order.reduceOnly === "true",
          broker_id: order.brokerId,
          create_time: new Date(parseInt(order.createTime!)),
        };
        
        const orderResult = await Stops.Publish(request);

        trigger_price: isEqual(order.stop_type, tp) ? format(order.tpTriggerPrice!) : format(order.slTriggerPrice!),
        order_price: isEqual(order.stop_type, tp) ? format(order.tpOrderPrice ?? "-1") : format(order.slOrderPrice ?? "-1"),
        // Standardized Multi-Table Publish
        const [current] = (await Stops.Fetch({ stop_request: order.stop_request, stop_type: order.stop_type })) ?? [{}];

        const pending = mapped.status === "Pending";
        const auto = auto_status === "Enabled";
        const history = source === "History";

        const key = hexString(order.stop_type, 2) + hexString(order.stop_request, 8);

        let requestResult: IPublishResult<IStopOrder> | undefined;

        if (requests.get(key)?.tpslId === order.tpslId) {
          if (history) {
            request.status = order.state === "effective" || order.state === "live" ? "Expired" : mapped.status;
          } else if (auto) {
            request.trigger_price = current.trigger_price;
            request.order_price = current.order_price;
            request.size = current.size;
            request.status = pending ? "Hold" : mapped.status;
          } else request.status = mapped.status;

          requestResult = await StopRequests.Publish(source, current, request);
        }

        return requestResult ? [orderResult, requestResult] : [orderResult];
      } catch (error) {
        //        console.log(`-> [Error] Stop.Orders.Publish.${source}`, error);
        const errBody: IPublishResult<IStopOrder> =
          error instanceof ApiError
            ? {
                key: undefined,
                response: { success: false, code: error.code, response: `error`, message: error.message, rows: 0, context: `Stop.Order.Publish.${source}` },
              }
            : {
                key: undefined,
                response: {
                  success: false,
                  code: -1,
                  response: `error`,
                  message: "Network or System failure",
                  rows: 0,
                  context: `Stop.Order.Publish.${source}`,
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
const History = async (): Promise<Array<Partial<IStopsAPI>>> => {
  const limit = Session().orders_max_fetch || 20;
  const history: Array<Partial<IStopsAPI>> = [];

  while (true) {
    console.error("-> [Info] Fetching Stops History from ID:", Session().audit_stops);
    const path = `/api/v1/trade/orders-tpsl-history?before=${Session().audit_stops}&limit=${limit}`;
    const result = await API_GET<Array<Partial<IStopsAPI>>>(path, "Stops.History");

    if (result && result.length > 0) {
      history.push(...result);
      setSession({ audit_stops: Math.max(...result.map((api) => parseInt(api.tpslId!))).toString() });
    } else break;

    await delay(1500);
  }

  console.log(`-> [Info] Stops.History: fetched ${history.length} records from API`);
  fileWrite<Partial<IStopsAPI>>(`log/stops_history_${new Date().toISOString()}.csv`, history);
  return history;
};

/**
 * Pending - retrieves all active orders, paginating if count > Session().orders_max_fetch;
 */
const Pending = async (): Promise<Array<Partial<IStopsAPI>>> => {
  const pending: Array<Partial<IStopsAPI>> = [];
  const limit = Session().orders_max_fetch || 20;

  let afterId = "0";

  while (true) {
    const path = `/api/v1/trade/orders-tpsl-pending?before=${afterId}&limit=${limit}`;

    try {
      const result = await API_GET<Array<Partial<IStopsAPI>>>(path, "Stops.Pending");
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
export const Import = async () => {
  console.log("In Orders.Import [API]");

  try {
    const [history, pending] = await Promise.all([History(), Pending()]);
    const result: Array<IPublishResult<IStopOrder>> = [];

    if (history.length > 0) {
      const historyResult = await Publish("History", history);
      result.push(...historyResult);
    }

    if (pending.length > 0) {
      const pendingResult = await Publish("Pending", pending);
      result.push(...pendingResult);
    }

    console.log(`-> Stops.Import complete; history stops processed: ${history.length}; open stops processed: ${pending.length};`);
    return result;
  } catch (error) {
    console.error(">> [Error] Stops.Import: Operation failure", error);
  }
};
