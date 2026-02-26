/**
 * Trade Request Management (The "Front-Loader").
 * 
 * Manages the initial intent of a trade before it is dispatched to a broker.
 * This module handles request queuing, automated expiry (TTL), and state 
 * management (e.g., Hold, Pending, Canceled).
 * 
 * @module db/request
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TRefKey, IOrder } from "#db";
import type { IRequestState, TRequestState } from "#db/interfaces/state";
import type { IPublishResult } from "#api";
import { Insert, Update, PrimaryKey } from "#db";
import { hasValues, isEqual, setExpiry } from "#lib/std.util";
import { hashKey } from "#lib/crypto.util";
import { Session } from "#module/session";
import { Order, State, Reference, InstrumentPosition } from "#db";

/**
 * Interface representing a trade request (Intent).
 */
export interface IRequest {
  /** Primary Key: Unique 12-character hash identifier. */
  request: Uint8Array;
  /** Foreign Key: Link to the specific instrument position. */
  instrument_position: Uint8Array;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  /** Foreign Key: Current request state hash. */
  state: Uint8Array;
  /** Human-readable status (e.g., 'Queued', 'Pending', 'Hold'). */
  status: TRequestState;
  request_state: Uint8Array;
  request_status: TRequestState;
  margin_mode: "cross" | "isolated";
  position: "short" | "long" | "net";
  action: "buy" | "sell";
  /** Foreign Key: Mapping to request_type table. */
  request_type: Uint8Array;
  order_type: string;
  price: number;
  size: number;
  leverage: number;
  digits: number;
  /** Internal log/note regarding request changes. */
  memo: string;
  reduce_only: boolean;
  /** Identifier provided by the broker upon submission. */
  broker_id: string;
  create_time: Date;
  /** Time at which the request is considered 'Expired' if not filled. */
  expiry_time: Date;
  update_time: Date;
}

/**
 * Synchronizes or initializes a trade request record.
 * 
 * Logic Flow:
 * 1. **Update Path**: If the request exists, it performs a diff-check on price, size, 
 *    leverage, and state. It prevents "stale" updates by checking `update_time`.
 * 2. **Hold Logic**: If a status is "Hold", the state hash update is deferred.
 * 3. **Insert Path**: If new, generates a 12-character hash, resolves the 
 *    `request_type` reference, and sets a default 8-hour expiry.
 * 
 * @param source - The origin of the update (e.g., 'API', 'WSS', 'Cancel').
 * @param current - The existing record state from the database.
 * @param props - The new data to be applied.
 * @returns A promise resolving to the publication result.
 */
export const Publish = async (source: string, current: Partial<IOrder>, props: Partial<IOrder>): Promise<IPublishResult<IOrder>> => {
  if (hasValues<Partial<IOrder>>(current)) {
    if (hasValues<Partial<IOrder>>(props)) {
      const state = props.status === "Hold" ? undefined : (await State.Key<IRequestState>({ status: props.status })) || props.state || current.state;

      if (props.update_time! > current.update_time!) {
        const revised: Partial<IOrder> = {
          request: current.request,
          action: props.action === current.action ? undefined : props.action,
          state: state ? (isEqual(state!, current.state!) ? undefined : state) : undefined,
          price: isEqual(props.price!, current.price!) ? undefined : props.price,
          size: isEqual(props.size!, current.size!) ? undefined : props.size,
          leverage: isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
          reduce_only: props.reduce_only ? (!!props.reduce_only === !!current.reduce_only ? undefined : !!props.reduce_only) : undefined,
          broker_id: props.broker_id?.length ? (props.broker_id === current.broker_id ? undefined : props.broker_id) : undefined,
        };

        const result = await Update(revised, { table: `request`, keys: [[`request`]], context: `Request.Publish.${source}` });

        if (result.success || !isEqual(props.expiry_time! || current.expiry_time, current.expiry_time!)) {
          const state = result.success && props.status === "Hold" ? await State.Key<IRequestState>({ status: "Hold" }) : undefined;
          const memo = !result.success ? `[Info] Request expiry updated to ${props.expiry_time?.toLocaleString()}` : undefined;
          const confirmed = await Update(
            {
              request: current.request,
              state,
              memo: props.memo === current.memo ? memo : props.memo,
              expiry_time: isEqual(props.expiry_time!, current.expiry_time!) ? undefined : props.expiry_time,
              update_time: props.update_time,
            },
            { table: `request`, keys: [[`request`]], context: `Request.Publish.${source}` },
          );

          return { key: PrimaryKey(current, [`request`]),response: confirmed };
        }
      }
      return {
        key: PrimaryKey(current, [`request`]),
        response: { success: false, code: 200, state: `exists`, message: `Request unchanged`, rows: 0, context: `Request.Publish.${source}` },
      };
    }

    return {
      key: PrimaryKey(current, [`request`]),
      response: {
        success: false,
        code: 400,
        state: `null_query`,
        message: `[Error] Request: No update properties provided from ${source}; request unchanged`,
        rows: 0,
        context: `Request.Publish.${source}`,
      },
    };
  }

  if (hasValues<Partial<IRequest>>(props)) {
    const process_time = new Date();
    const queued = await State.Key<IRequestState>({ status: "Queued" });
    const request_type = await Reference.Key<TRefKey>({ source_ref: props.order_type || `limit` }, { table: `request_type` });
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
  return {
    key: undefined,
    response: {
      success: false,
      code: 400,
      state: `null_query`,
      message: "[Error] Request.Publish: Nothing to publish",
      rows: 0,
      context: `Request.Publish.${source}`,
    },
  };
};

/**
 * Marks requests as Canceled or Closed in the local database.
 * 
 * This triggers a cascaded update: 
 * - 'Pending' orders move to 'Canceled'.
 * - Active/Filled orders move to 'Closed'.
 * 
 * @param props - Filter criteria to identify orders/requests to cancel.
 * @returns A promise resolving to an array of results for each request updated.
 */
export const Cancel = async (props: Partial<IOrder>): Promise<Array<IPublishResult<IRequest>>> => {
  const orders = await Order.Fetch(props.request ? { request: props.request } : props);

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

/**
 * Validates, prepares, and queues a trade request for broker submission.
 * 
 * Logic Flow:
 * 1. **Position Validation**: Ensures the target [InstrumentPosition](url) exists for the account.
 * 2. **Deduplication**: Checks for existing 'Pending' or 'Queued' requests for this position.
 * 3. **Auto-Trade Logic**: If `auto_status` is enabled, it automatically triggers a {@link Cancel} 
 *    for all other active requests in the queue to prevent overlapping orders.
 * 4. **State Transitions**:
 *    - If the position is 'Auto-Enabled' and an order is 'Pending', the new request 
 *      is placed on **'Hold'** to await the cancellation of the current order.
 *    - Otherwise, it proceeds to {@link Publish} as a 'Submit' or 'Update'.
 * 5. **Stale Check**: Uses `update_time` to ensure incoming UI/API updates are newer 
 *    than the currently stored record.
 * 
 * @param props - The request parameters (price, size, leverage, etc.) to be submitted.
 * @returns A promise resolving to the final submission result, 'Hold' status, or 'Exists' confirmation.
 */
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
  const found = await Order.Fetch(search, { suffix: `ORDER BY update_time DESC LIMIT 1` });

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
      const queue = await Order.Fetch({ instrument_position }, { suffix: `AND status IN ("Pending", "Queued")` });

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
