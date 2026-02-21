//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRefKey, IOrder } from "#db";
import type {} from "#db/interfaces/reference";
import type { IRequestState, TRequestState } from "#db/interfaces/state";
import type { IPublishResult } from "#api";

import { Insert, Update } from "#db/query.utils";
import { PrimaryKey } from "#api";
import { hasValues, isEqual, setExpiry } from "#lib/std.util";
import { hashKey } from "#lib/crypto.util";
import { Session } from "#module/session";

import * as Orders from "#db/interfaces/order";
import * as States from "#db/interfaces/state";
import * as References from "#db/interfaces/reference";
import * as InstrumentPosition from "#db/interfaces/instrument_position";

export interface IRequest {
  request: Uint8Array;
  instrument_position: Uint8Array;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  state: Uint8Array;
  status: TRequestState;
  request_state: Uint8Array;
  request_status: TRequestState;
  margin_mode: "cross" | "isolated";
  position: "short" | "long" | "net";
  action: "buy" | "sell";
  request_type: Uint8Array;
  order_type: string;
  price: number;
  size: number;
  leverage: number;
  digits: number;
  memo: string;
  reduce_only: boolean;
  broker_id: string;
  create_time: Date;
  expiry_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Applies updates to request on select columns;                                        |
//+--------------------------------------------------------------------------------------+
export const Publish = async (source: string, current: Partial<IOrder>, props: Partial<IOrder>): Promise<IPublishResult<IOrder>> => {
  const context = `Request.Publish.${source}`;

  // 1. Core Immutability Check
  if (!hasValues<Partial<IOrder>>(props)) {
    return { key: PrimaryKey(current, [`request`]), response: { success: false, code: 400, rows: 0, state: `null_query`, message: `[Error] ${context}:`, context } };
  }

  // 2. Handle new requests
  if (!hasValues<Partial<IOrder>>(current)) {
    const process_time = new Date();
    const queued = await States.Key<IRequestState>({ status: "Queued" });
    const request_type = await References.Key<TRefKey>({ source_ref: props.order_type || `limit` }, { table: `request_type` });
    const request: Partial<IRequest> = {
      request: props.request || hashKey(12),
      instrument_position: props.instrument_position,
      action: props.action,
      state: props.request ? props.state || queued : queued,
      price: props.price,
      size: props.size,
      leverage: props.leverage,
      request_type,
      margin_mode: props.margin_mode || Session().margin_mode || `cross`,
      reduce_only: props.reduce_only ? !!props.reduce_only : undefined,
      broker_id: props.broker_id || undefined,
      memo: props.memo || "[Info] Request.Publish: Request does not exist; proceeding with submission",
      create_time: props.create_time || process_time,
      expiry_time: props.expiry_time || setExpiry("8h", props.create_time || new Date()),
      update_time: props.update_time || process_time,
    };
    const result = await Insert<IRequest>(request, { table: `request`, context: `Request.Publish.${source}` });
    return { key: PrimaryKey(request, [`request`]), response: result };
  }

  // 3. Handle updates
  // --> Chronology Guard
  if (props.update_time! <= current.update_time!) {
    return {
      key: PrimaryKey(current, [`request`]),
      response: { success: false, code: 200, state: `exists`, message: `Stale update ignored`, rows: 0, context },
    };
  }

  /**
   * STEP 1: Core Mutable Elements
   * If these change, we trigger the primary update.
   * This logic explicitly excludes state/memo/expiry.
   */
  const coreRevision: Partial<IOrder> = {
    request: current.request,
    action: props.action !== current.action ? props.action : undefined,
    price: !isEqual(props.price!, current.price!) ? props.price : undefined,
    size: !isEqual(props.size!, current.size!) ? props.size : undefined,
    leverage: !isEqual(props.leverage!, current.leverage!) ? props.leverage : undefined,
    reduce_only: !!props.reduce_only !== !!current.reduce_only ? !!props.reduce_only : undefined,
    broker_id: props.broker_id !== current.broker_id ? props.broker_id : undefined,
  };

  // Execute Core Tap
  const coreResult = await Update(coreRevision, { table: `request`, keys: [[`request`]], context: `${context}.Core` });

  /**
   * STEP 2: Non-Core / State Business Logic
   * We only apply 'Hold' or 'Expiry' updates if Core succeeded OR if ONLY expiry changed.
   */
  const hasCoreChanged = coreResult.success;
  const isExpiryChanged = !isEqual(props.expiry_time!, current.expiry_time!);

  if (hasCoreChanged || isExpiryChanged) {
    // Business Rule: Trigger 'Hold' only if core changed and status is 'Pending'
    const shouldHold = hasCoreChanged && props.status === "Hold" && current.status === "Pending";
    const state = shouldHold ? await States.Key<IRequestState>({ status: "Hold" }) : undefined;

    // Business Rule: Memo override logic
    const memo = !hasCoreChanged && isExpiryChanged ? `[Info] Request expiry updated to ${props.expiry_time?.toLocaleString()}` : props.memo;

    const nonCoreRevision: Partial<IOrder> = {
      request: current.request,
      state,
      memo: memo !== current.memo ? memo : undefined,
      expiry_time: isExpiryChanged ? props.expiry_time : undefined,
      update_time: props.update_time,
    };

    const finalResult = await Update(nonCoreRevision, { table: `request`, keys: [[`request`]], context: `${context}.State` });
    return { key: PrimaryKey(current, [`request`]), response: finalResult };
  }

  return {
    key: PrimaryKey(current, [`request`]),
    response: { success: false, code: 200, state: `exists`, message: `Request unchanged`, rows: 0, context },
  };
};

//+--------------------------------------------------------------------------------------+
//| Cancels requests in local db meeting criteria; initiates cancel to broker;           |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (props: Partial<IOrder>): Promise<Array<IPublishResult<IRequest>>> => {
  const orders = await Orders.Fetch(props.request ? { request: props.request } : props);

  if (!orders) {
    console.log("[Error]: Unauthorized cancellation attempt");
    return [
      {
        key: undefined,
        response: {
          success: false,
          code: 400,
          state: `null_query`,
          message: "[Error] Request.Cancel: Nothing to cancel",
          rows: 0,
          context: "Request.Cancel",
        },
      },
    ];
  }

  const cancels = await Promise.all(
    orders.map(async (order) => {
      const result = await Publish(`Cancel`, order, {
        ...order,
        status: order.status === `Pending` ? `Canceled` : `Closed`,
        memo: props.memo || `[Cancel]: Request ${props.request} canceled by user/system`,
        update_time: new Date(),
      });
      return result;
    }),
  );
  return cancels;
};

//+--------------------------------------------------------------------------------------+
//| Verify/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IRequest>): Promise<IPublishResult<IRequest>> => {
  if (!hasValues(props)) {
    console.log(">> [Error] Request.Submit: No request properties provided; request rejected");
    return {
      key: undefined,
      response: { success: false, code: 400, state: `null_query`, message: `No request properties provided`, rows: 0, context: "Request.Submit" },
    };
  }

  const query = props.instrument_position
    ? { instrument_position: props.instrument_position }
    : { account: props.account || Session().account, symbol: props.symbol, position: props.position };
  const exists = await InstrumentPosition.Fetch(query);

  if (!exists) {
    console.log(">> [Error] Request.Submit: Invalid request; missing instrument position; request rejected");
    return {
      key: undefined,
      response: { success: false, code: 404, state: `error`, message: `Instrument position not found`, rows: 0, context: "Request.Submit" },
    };
  }

  const [{ instrument_position, auto_status, leverage, margin_mode, open_request }] = exists;
  const search: Partial<IRequest> = props.request ? { request: props.request } : { instrument_position, status: open_request ? "Pending" : "Queued" };
  const found = await Orders.Fetch(search, { suffix: `ORDER BY update_time DESC LIMIT 1` });

  if (!found) {
    return await Publish(
      `Submit`,
      {},
      {
        ...props,
        instrument_position,
        leverage: props.leverage || leverage,
        margin_mode: props.margin_mode || margin_mode,
        memo: props.memo || `[Warning] Request.Submit: Request missing; was added locally; updated and settled`,
      },
    );
  }
  const [current] = found;
  props.update_time ??= new Date();

  if (props.update_time > current.update_time!) {
    if (auto_status === "Enabled") {
      const queue = await Orders.Fetch({ instrument_position }, { suffix: `AND status IN ("Pending", "Queued")` });

      if (queue) {
        await Promise.all(
          queue
            .filter(({ request }) => !isEqual(request!, current.request!))
            .map(async ({ request }) => {
              Cancel({ request, memo: `[Warning] Request.Submit: New request on open instrument/position auto-cancels existing` });
            }),
        );
      }
      props.status = current.status === "Pending" ? "Hold" : props.status || current.status;
    }

    if (props.status === "Hold") {
      return await Publish(`Hold`, current, {
        ...props,
        memo: props.memo || `[Info] Request.Submit: Request updated; was put on hold; awaiting cancel for resubmit`,
      });
    }
    return await Publish(`Submit`, current, { ...props, memo: props.memo || `[Info] Request.Submit: Request exists; updated locally` });
  }

  return {
    key: undefined,
    response: {
      success: true,
      code: 201,
      state: `exists`,
      message: `-> [Info] Request.Submit: Queued request verified`,
      rows: 0,
      context: "Request.Submit",
    },
  };
};
