/**
 * Trade Order Ledger and Execution Tracking.
 *
 * Manages the persistence of individual exchange orders, including
 * status transitions, fill metrics, fees, and PnL. It ensures that
 * broker-specific metadata is mapped to internal system references.
 *
 * @module db/order
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TOptions, TRefKey, IRequest } from "#db";
import type { IPublishResult } from "#api";
import { Select, Insert, Update } from "#db";
import { PrimaryKey } from "#api";
import { hasValues, isEqual } from "#lib/std.util";
import { Session } from "#module/session";
import * as References from "#db/interfaces/reference";

/**
 * Interface representing a specific trade order.
 * Extends {@link IRequest} to include execution and settlement data.
 */
export interface IOrder extends IRequest {
  /** Primary Key: Unique exchange-provided order identifier. */
  order_id: Uint8Array;
  /** Local unique identifier for request tracking. */
  client_order_id: Uint8Array;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  /** Foreign Key: Reference to the current order state. */
  order_state: Uint8Array;
  order_status: string;
  contract_type: string;
  instrument_type: Uint8Array;
  /** Foreign Key: Reference to the order category (e.g., normal, algo). */
  order_category: Uint8Array;
  category: string;
  /** Foreign Key: Reference to the cancellation reason/source. */
  cancel_source: Uint8Array;
  canceled_by: string;
  /** Total value of the filled portion of the order. */
  filled_amount: number;
  /** Total quantity of the filled portion of the order. */
  filled_size: number;
  /** Average price of all fills for this order. */
  average_price: number;
  /** Total exchange fees incurred. */
  fee: number;
  /** Realized PnL (for closing orders). */
  pnl: number;
  trade_period: Uint8Array;
  trade_timeframe: string;
}

/**
 * Synchronizes order execution data with the local database.
 *
 * Logic Flow:
 * 1. Performs a lookup by `order_id` to determine if the record exists.
 * 2. If Exists: Performs a "diff-check" and updates only changed metrics
 *    (fills, fees, PnL, state).
 * 3. If Missing: Parallel-resolves metadata from {@link References}
 *    (category, state, cancel source) and performs an {@link Insert}.
 *
 * @param props - Partial order data, typically from a broker API or WSS feed.
 * @returns A promise resolving to the publication result and order primary key.
 */
export const Publish = async (props: Partial<IOrder>): Promise<IPublishResult<IOrder>> => {
  if (!props) {
    console.log(">> [Error] Order.Publish: No order properties provided; publishing rejected");
    return {
      key: undefined,
      response: {
        success: false,
        code: 400,
        state: `null_query`,
        rows: 0,
        context: "Orders.Publish",
        message: "No order properties provided; publishing rejected",
      },
    };
  }
  const { order_id } = props;
  const exists = await Select<IOrder>({ order_id }, { table: `orders` });

  if (exists.success && exists.data?.length) {
    const [current] = exists.data;
    const revised: Partial<IOrder> = {
      order_id,
      order_category: isEqual(props.order_category!, current.order_category!) ? undefined : props.order_category,
      order_state: isEqual(props.order_state!, current.order_state!) ? undefined : props.order_state,
      cancel_source: isEqual(props.cancel_source!, current.cancel_source!) ? undefined : props.cancel_source,
      filled_size: isEqual(props.filled_size!, current.filled_size!) ? undefined : props.filled_size,
      filled_amount: isEqual(props.filled_amount!, current.filled_amount!) ? undefined : props.filled_amount,
      average_price: isEqual(props.average_price!, current.average_price!) ? undefined : props.average_price,
      fee: isEqual(props.fee!, current.fee!) ? undefined : props.fee,
      pnl: isEqual(props.pnl!, current.pnl!) ? undefined : props.pnl,
    };

    const result = await Update<IOrder>(revised, { table: `orders`, keys: [[`order_id`]] });
    return { key: PrimaryKey({ order_id }, ["order_id"]), response: { ...result, context: "Orders.Publish" } };
  }

  const [order_category, order_state, cancel_source] = await Promise.all([
    props.order_category ? Promise.resolve(props.order_category) : References.Key<TRefKey>({ source_ref: "normal" }, { table: `order_category` }),
    props.order_state ? Promise.resolve(props.order_state) : References.Key<TRefKey>({ source_ref: props.order_status }, { table: `order_state` }),
    props.cancel_source ? Promise.resolve(props.cancel_source) : References.Key<TRefKey>({ source_ref: "not_canceled" }, { table: `cancel_source` }),
  ]);
  const order: Partial<IOrder> = {
    order_id,
    client_order_id: props.client_order_id!,
    order_category,
    order_state,
    cancel_source,
    filled_size: props.filled_size!,
    filled_amount: props.filled_amount!,
    average_price: props.average_price!,
    fee: props.fee!,
    pnl: props.pnl!,
  };
  const result = await Insert<IOrder>(order, { table: `orders` });
  return { key: PrimaryKey({ order_id }, ["order_id"]), response: { ...result, context: "Orders.Publish" } };
};

/**
 * Retrieves order records from the `vw_orders` database view.
 * Automatically filters by the active {@link Session} account if not specified.
 *
 * @param props - Query filters.
 * @param options - Database query modifiers.
 * @returns An array of partial order records or undefined.
 */
export const Fetch = async (props: Partial<IOrder>, options?: TOptions<IOrder>): Promise<Array<Partial<IOrder>> | undefined> => {
  props.account = props.account || Session().account;
  const result = await Select<IOrder>(props, { ...options, table: `vw_orders` });
  return result.success ? result.data : undefined;
};

/**
 * Resolves the parent `request` hash for a specific order.
 *
 * @param props - Search parameters (typically `order_id` or `client_order_id`).
 * @returns The Uint8Array request key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IOrder>): Promise<IOrder["request"] | undefined> => {
  if (hasValues<Partial<IOrder>>(props)) {
    props.account = props.account || Session().account;
    const result = await Select<IOrder>(props, { table: `vw_orders` });
    return result.success && result.data?.length ? result.data[0].request : undefined;
  }
  return undefined;
};
