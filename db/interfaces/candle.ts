/**
 * Market Data and Time-Series Candle Management.
 * 
 * Handles the persistence and retrieval of OHLCV (Open, High, Low, Close, Volume) 
 * data. Includes specialized logic for high-frequency updates and historical 
 * sequence fetching.
 * 
 * @module db/candle
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TKey, TOptions } from "#db";
import { Select, Insert, Update } from "#db";
import { isEqual } from "#lib/std.util";

/**
 * Interface representing a single market candle (bar).
 */
export interface ICandle {
  /** Foreign Key: Unique instrument identifier. */
  instrument: Uint8Array;
  symbol: string;
  /** Foreign Key: Unique timeframe/period identifier. */
  period: Uint8Array;
  timeframe: string;
  /** Unix timestamp (milliseconds) for the start of the candle. */
  timestamp: number;
  /** Internal field for controlling history fetch depth. */
  limit: number;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  /** Human-readable date object for the candle start. */
  bar_time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Base currency volume. */
  volume: number;
  /** Volume expressed in the asset currency. */
  vol_currency: number;
  /** Volume expressed in the quote currency (e.g., USDT value). */
  vol_currency_quote: number;
  /** Flag indicating if the candle period has finalized. */
  completed: boolean;
}

/**
 * Updates an existing candle or inserts a new one based on incoming market data.
 * 
 * Performance Logic:
 * - Uses a composite lookup (instrument + period + timestamp).
 * - Implements a precision threshold (5 decimal places) for volume fields to 
 *   ignore floating-point noise and reduce unnecessary database writes.
 * - Only 'diff' fields are updated to minimize transaction overhead.
 * 
 * @param props - Partial candle data from the market source.
 * @returns A promise resolving to the database operation result.
 */
export const Publish = async (props: Partial<ICandle>) => {
  const { instrument, period, timestamp } = props;
  const candles = await Fetch({ instrument, period, timestamp });

  if (candles) {
    const [candle] = candles;
    const revised = {
      instrument,
      period,
      timestamp,
      open: isEqual(props.open!, candle.open!) ? undefined : props.open,
      high: isEqual(props.high!, candle.high!) ? undefined : props.high,
      low: isEqual(props.low!, candle.low!) ? undefined : props.low,
      close: isEqual(props.close!, candle.close!) ? undefined : props.close,
      volume: isEqual(props.volume!, candle.volume!) ? undefined : props.volume,
      vol_currency: isEqual(props.vol_currency!, candle.vol_currency!, 5) ? undefined : props.vol_currency,
      vol_currency_quote: isEqual(props.vol_currency_quote!, candle.vol_currency_quote!, 5) ? undefined : props.vol_currency_quote,
      completed: !!props.completed === !!candle.completed! ? undefined : props.completed,
    };
    return await Update<ICandle>(revised, {
      table: `candle`,
      keys: [[`instrument`], [`period`], [`timestamp`]],
      context: "Candle.Publish",
    });
  } else {
    await Insert<ICandle>(
      {
        instrument,
        period,
        timestamp,
        open: props.open,
        high: props.high,
        low: props.low,
        close: props.close,
        volume: props.volume,
        vol_currency: props.vol_currency,
        vol_currency_quote: props.vol_currency_quote,
        completed: props.completed,
      },
      { table: `candle`, context: "Candle.Publish" },
    );
  }
};

/**
 * Retrieves candles matching the provided criteria from the view or table.
 * 
 * @param props - Query filters (instrument, period, etc.).
 * @param options - Additional query modifiers (table overrides, custom suffixes).
 * @returns An array of partial candle records or undefined.
 */
export const Fetch = async (props: Partial<ICandle>, options?: TOptions<ICandle>): Promise<Array<Partial<ICandle>> | undefined> => {
  const result = await Select<ICandle>(props, { table: options?.table || `vw_candles`, limit: options?.limit, suffix: options?.suffix });
  return result.success ? result.data : undefined;
};

/**
 * Fetches a chronological sequence of historical candles.
 * 
 * Automatically sorts by `timestamp DESC` and applies a limit to ensure 
 * efficient retrieval of recent market history.
 * 
 * @param props - Filter criteria, including an optional `timestamp` for "starting at" logic.
 * @returns A promise resolving to the requested historical candle set.
 */
export const History = async (props: Partial<ICandle>): Promise<Array<Partial<ICandle>> | undefined> => {
  const { limit, ...columns } = props;
  const suffix = `ORDER BY timestamp DESC LIMIT ${limit || 1}`;
  //  const keys: Array<TKey<ICandle>> = [...(props.timestamp ? [["timestamp", "<="] as TKey<ICandle>] : [])];
  const keys: Array<TKey<ICandle>> = [];
  props.timestamp && keys.push(["timestamp", "<="]);
  const result = await Select<ICandle>(columns, { table: `vw_candles`, keys, suffix });

  return result.success ? result.data : undefined;
};
