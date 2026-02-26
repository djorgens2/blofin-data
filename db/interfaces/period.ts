/**
 * Timeframe and Candle Period Management.
 * 
 * Defines the standard time intervals (e.g., 1m, 5m, 1h, 1d) used for 
 * market data aggregation, charting, and historical analysis.
 * 
 * @module db/period
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a standardized time interval.
 */
export interface IPeriod {
  /** Primary Key: Unique 6-character hash identifier. */
  period: Uint8Array;
  /** Human-readable timeframe label (e.g., "1h", "4h", "1D"). */
  timeframe: string;
  /** Detailed description of the period usage. */
  description: string;
  /** The duration of the timeframe expressed in seconds (e.g., 3600 for 1h). */
  timeframe_units: number;
}

/**
 * Persists a new timeframe period to the database.
 * 
 * Logic Flow:
 * 1. Generates a new 6-character unique hash for the period.
 * 2. Assigns the hash to the provided properties object.
 * 3. Inserts the record into the `period` table.
 * 
 * @param props - Period details including `timeframe` label and `timeframe_units`.
 * @returns A promise resolving to the publication result and the new primary key.
 */
export const Add = async (props: Partial<IPeriod>): Promise<IPublishResult<IPeriod>> => {
  Object.assign(props, { period: hashKey(6) });
  const result = await Insert<IPeriod>(props, { table: `period`, ignore: true });
  return { key: PrimaryKey(props, ["period"]), response: result };
};

/**
 * Searches for a period's unique primary key based on provided criteria.
 * Commonly used to resolve a string like "1h" to its internal hash.
 * 
 * @param props - Search parameters (typically the `timeframe` string).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IPeriod>): Promise<IPeriod["period"] | undefined> => {
  if (hasValues<Partial<IPeriod>>(props)) {
    const result = await Select<IPeriod>(props, { table: `period` });
    return result.success && result.data?.length ? result.data[0].period : undefined;
  }
  return undefined;
};

/**
 * Retrieves a collection of period records matching the supplied criteria.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all periods.
 * @returns An array of partial period records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IPeriod>): Promise<Array<Partial<IPeriod>> | undefined> => {
  const result = await Select<IPeriod>(props, { table: `period` });
  return result.success ? result.data : undefined;
};
