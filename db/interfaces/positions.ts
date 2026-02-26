/**
 * Market Position Ledger (DCA Bucket Management).
 * 
 * Manages the persistence of active market exposure. Since the broker 
 * decouples orders from positions and relies on Dollar-Cost-Averaging (DCA), 
 * this module serves as the authoritative record for current average price, 
 * total size, and liquidation risk.
 * 
 * @module db/positions
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TPositionState } from "#db/interfaces/state";
import type { IPublishResult } from "#api";
import { Select, Insert, Update, PrimaryKey } from "#db";
import { hasValues, isEqual } from "#lib/std.util";
import { Session } from "#module/session";

/**
 * Interface representing a synthesized market position (DCA Bucket).
 */
export interface IPositions {
  /** Foreign Key: Link to the active account hash. */
  account: Uint8Array;
  /** Primary Key: Unique hexified position identifier from the exchange. */
  positions: Uint8Array;
  /** Foreign Key: Link to the parent instrument-position mapping. */
  instrument_position: Uint8Array;
  /** Foreign Key: Link to the underlying instrument master. */
  instrument: Uint8Array;
  symbol: string;
  /** Direction of the synthesized position. */
  position: "short" | "long" | "net";
  /** Foreign Key: Current state identifier. */
  state: Uint8Array;
  /** Human-readable status (e.g., 'Open', 'Closed'). */
  status: TPositionState;
  instrument_type: Uint8Array;
  /** Primary action required to increase this position. */
  action: "buy" | "sell";
  /** Primary action required to close/reduce this position. */
  counter_action: "buy" | "sell";
  /** Total quantity currently held in the DCA bucket. */
  size: number;
  /** Quantity available for reduction/closure. */
  size_available: number;
  /** Applied leverage for this synthesized position. */
  leverage: number;
  margin_mode: "cross" | "isolated";
  /** Current margin collateral utilized. */
  margin_used: number;
  /** Health ratio based on maintenance margin requirements. */
  margin_ratio: number;
  margin_initial: number;
  margin_maint: number;
  /** The Dollar-Cost-Average (DCA) entry price. */
  average_price: number;
  /** Calculated price at which the bucket faces liquidation. */
  liquidation_price: number;
  /** Current index mark price used for PnL calculation. */
  mark_price: number;
  /** Current floating profit or loss. */
  unrealized_pnl: number;
  /** PnL expressed as a percentage of utilized margin. */
  unrealized_pnl_ratio: number;
  /** Auto-Deleveraging (ADL) priority ranking. */
  adl: number;
  create_time: Date;
  update_time: Date;
}

/**
 * Synchronizes real-time position data (typically from WSS) with the database.
 * 
 * Performance Logic:
 * 1. Validates that the payload contains identifying data.
 * 2. Lookup: Searches for an existing position within the current {@link Session}.
 * 3. Update Path: Performs an extensive "diff-check" to ensure only volatile 
 *    metrics (PnL, Prices, ADL) trigger a database write.
 * 4. Insert Path: Records newly initialized DCA buckets.
 * 
 * @param props - Partial position metrics from the market source.
 * @param context - Tracing context for logging.
 * @returns A promise resolving to the publication result and composite keys.
 */
export const Publish = async (props: Partial<IPositions>, context = "Positions"): Promise<IPublishResult<IPositions>> => {
  context = `${context}.Publish`;
  if (!hasValues(props)) {
    return { key: undefined, response: { success: false, code: 415, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context } };
  }

  const exists = await Fetch({ account: Session().account, positions: props.positions });

  if (exists) {
    const [current] = exists;
    const revised: Partial<IPositions> = {
      positions: current.positions,
      size: isEqual(props.size!, current.size!) ? undefined : props.size,
      size_available: isEqual(props.size_available!, current.size_available!) ? undefined : props.size_available,
      leverage: isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
      margin_mode: props.margin_mode! === current.margin_mode! ? undefined : props.margin_mode,
      margin_used: isEqual(props.margin_used!, current.margin_used!) ? undefined : props.margin_used,
      margin_ratio: isEqual(props.margin_ratio!, current.margin_ratio!) ? undefined : props.margin_ratio,
      margin_initial: isEqual(props.margin_initial!, current.margin_initial!) ? undefined : props.margin_initial,
      margin_maint: isEqual(props.margin_maint!, current.margin_maint!) ? undefined : props.margin_maint,
      average_price: isEqual(props.average_price!, current.average_price!) ? undefined : props.average_price,
      mark_price: isEqual(props.mark_price!, current.mark_price!) ? undefined : props.mark_price,
      liquidation_price: isEqual(props.liquidation_price!, current.liquidation_price!) ? undefined : props.liquidation_price,
      unrealized_pnl: isEqual(props.unrealized_pnl!, current.unrealized_pnl!) ? undefined : props.unrealized_pnl,
      unrealized_pnl_ratio: isEqual(props.unrealized_pnl_ratio!, current.unrealized_pnl_ratio!) ? undefined : props.unrealized_pnl_ratio,
      adl: isEqual(props.adl!, current.adl!) ? undefined : props.adl,
      create_time: isEqual(props.create_time!, current.create_time!) ? undefined : props.create_time,
      update_time: isEqual(props.update_time!, current.update_time!) ? undefined : props.update_time,
    };
    const result = await Update(revised, { table: `positions`, keys: [[`positions`]], context });
    return {
      key: PrimaryKey(current, ["positions", "instrument_position"]),
      response: result,
    };
  }

  const result = await Insert<IPositions>(props, { table: `positions`, context });
  return {
    key: PrimaryKey(props, ["positions", "instrument_position"]),
    response: result,
  };
};

/**
 * Retrieves position records from the `vw_positions` view.
 * 
 * @param props - Query filters (e.g., specific symbol or status).
 * @returns An array of matching partial position records or undefined.
 */
export const Fetch = async (props: Partial<IPositions>): Promise<Array<Partial<IPositions>> | undefined> => {
  const result = await Select<IPositions>(props, { table: `vw_positions` });
  return result.success ? result.data : undefined;
};