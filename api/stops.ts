//+--------------------------------------------------------------------------------------+
//|                                                                      [api]  stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TRequestState } from "db/interfaces/state";
import type { IStopOrder } from "db/interfaces/stops";
import type { TRefKey } from "db/interfaces/reference";
import type { IPublishResult } from "db/query.utils";

import { Session, setSession, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { delay, format, hexString, isEqual } from "lib/std.util";
import { API_GET, ApiError } from "api/api.util";

import * as Response from "api/response";
import * as Stops from "db/interfaces/stops";
import * as StopRequests from "db/interfaces/stop_request";
import * as States from "db/interfaces/state";
import * as Reference from "db/interfaces/reference";
import * as InstrumentPositions from "db/interfaces/instrument_position";

export interface IStopsAPI {
  account: Uint8Array;
  status: TRequestState;
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

  // 1. Flatten the API objects: One incoming order can become two independent DB records (TP and SL)
  // Parallel Reference Lookups
  const [tp, sl] = await Promise.all([
    Reference.Key<TRefKey>({ source_ref: "tp" }, { table: `stop_type` }),
    Reference.Key<TRefKey>({ source_ref: "sl" }, { table: `stop_type` }),
  ]);

  if (!tp || !sl) {
    throw new ApiError(602, `Invalid stop type references for Stops.Publish`);
  }

  const stops = props.flatMap((order) => {
    const tpsl_id = order.clientOrderId && order.clientOrderId.length > 2 ? order.clientOrderId.slice(2) : parseInt(order.tpslId || "0").toString(16);
    const tp_id = (order.tpTriggerPrice ?? order.tpOrderPrice) != null ? hexify(tpsl_id, 4) : undefined;
    const sl_id = (order.slTriggerPrice ?? order.slOrderPrice) != null ? hexify(tpsl_id, 4) : undefined;

    const items = [];

    tp_id && items.push({ ...order, stop_request: tp_id, stop_type: tp });
    sl_id && items.push({ ...order, stop_request: sl_id, stop_type: sl });

    return items;
  });

  // 2. Pre-filter Latest Wins (Deduplication)
  const requests = new Map<string, (typeof stops)[0]>();
  for (const item of stops) {
    const key = hexString(item.stop_type, 2) + hexString(item.stop_request, 8);
    const existing = requests.get(key);
    if (!existing || BigInt(item.tpslId || "0") > BigInt(existing.tpslId || "0")) {
      requests.set(key, item);
    }
  }

  // 3. Process all normalized stops in parallel
  const results = await Promise.all(
    stops.map(async (order): Promise<Array<IPublishResult<IStopOrder>>> => {
      try {
        const client_order_id = hexify(order.clientOrderId!.slice(2), 4);
        const tpsl_id = hexify(parseInt(order.tpslId!), 4);

        // Parallel Reference Lookups
        const [required, order_category, order_states, expiredState] = await Promise.all([
          InstrumentPositions.Fetch({ account: Session().account, symbol: order.instId, position: order.positionSide }),
          Reference.Key<TRefKey>({ source_ref: order.orderCategory || "normal" }, { table: `order_category` }),
          Reference.Fetch({ source_ref: order.state }, { table: `vw_order_states` }),
          States.Key({ status: "Expired" }),
        ]);

        if (!required) {
          throw new ApiError(452, `Invalid instrument position for ${order.tpslId}; stop order rejected`);
        }

        if (!order_states) throw new ApiError(453, `Invalid Order State metadata; unable to resolve state [${order.state}] on Order: ${order.tpslId}`);

        // Determine State Logic (Zombie Protection)
        const [mapped] = order_states;
        const [{ instrument_position, auto_status }] = required;

        const request: Partial<IStopOrder> = {
          tpsl_id,
          stop_type: order.stop_type,
          client_order_id,
          instrument_position,
          margin_mode: order.marginMode || Session().margin_mode || `cross`,
          state: mapped.state,
          order_state: mapped.order_state,
          order_category,
          stop_request: order.stop_request,
          action: order.side,
          size: format(order.size!),
          actual_size: format(order.actualSize!),
          trigger_price: isEqual(order.stop_type, tp) ? format(order.tpTriggerPrice!) : format(order.slTriggerPrice!),
          order_price: isEqual(order.stop_type, tp) ? format(order.tpOrderPrice ?? "-1") : format(order.slOrderPrice ?? "-1"),
          update_time: new Date(),
        };

        // Standardized Multi-Table Publish
        const orderResult = await Stops.Publish(request);
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
  //  fileWrite<Partial<IStopsAPI>>(`log/stops_history_${new Date().toISOString()}.csv`, history );
  return history;
};

/**
 * Pending - retrieves all active orders, paginating if count > 100
 */
export const Pending = async (): Promise<Array<Partial<IStopsAPI>>> => {
  const pending: Array<Partial<IStopsAPI>> = [];
  const limit = Session().orders_max_fetch || 20;

  let afterId = "0";

  while (true) {
    const path = `/api/v1/trade/orders-tpsl-pending?after=${afterId}&limit=${limit}`;

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

//+--------------------------------------------------------------------------------------+
//| Cancel - closes a pending TP/SL order;                                               |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (cancels: Array<Partial<IStopsAPI>>) => {
  console.log(`-> Cancel [API]`);

  const method = "POST";
  const path = "/api/v1/trade/cancel-tpsl";
  const body = JSON.stringify(cancels);

  const { api, phrase, rest_api_url } = Session();
  const { sign, timestamp, nonce } = await signRequest(method, path, body);
  const headers = {
    "ACCESS-KEY": api!,
    "ACCESS-SIGN": sign!,
    "ACCESS-TIMESTAMP": timestamp!,
    "ACCESS-NONCE": nonce!,
    "ACCESS-PASSPHRASE": phrase!,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(rest_api_url!.concat(path), {
      method,
      headers,
    });
    if (response.ok) {
      const json = await response.json();
      return await Response.Stops(json, { success: "Closed", fail: "Canceled" });
    } else throw new Error(`Stops.Cancel: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(error);
    return [];
  }
};

//+--------------------------------------------------------------------------------------+
//| Submit - submits a pending TP/SL order;                                              |
//+--------------------------------------------------------------------------------------+
export const Submit = async (request: Partial<IStopsAPI>) => {
  const method = "POST";
  const path = "/api/v1/trade/order-tpsl";
  const body = JSON.stringify(request);
  const { api, phrase, rest_api_url } = Session();
  const { sign, timestamp, nonce } = await signRequest(method, path, body);
  const headers = {
    "ACCESS-KEY": api!,
    "ACCESS-SIGN": sign!,
    "ACCESS-TIMESTAMP": timestamp!,
    "ACCESS-NONCE": nonce!,
    "ACCESS-PASSPHRASE": phrase!,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(rest_api_url!.concat(path), {
      method,
      headers,
      body,
    });

    if (response.ok) {
      const json = await response.json();
      return await Response.Stops(json, { success: "Pending", fail: "Rejected" });
    } else throw new Error(`Stops.Submit: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(error);
  }
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
