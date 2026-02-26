/**
 * Generic Referential Integrity Hydrator.
 * 
 * Manages the seeding and retrieval of static exchange and system constants.
 * This module is designed to be highly malleable, allowing new referential 
 * tables (e.g., cancel_source, order_category) to be hydrated via JSON seeds 
 * without modifying core logic.
 * 
 * @module db/reference
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TRequestState } from "#db/interfaces/state";
import type { TOptions } from "#db";
import { Select, Insert } from "#db/query.utils";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a generic referential record.
 * Supports dynamic keys to accommodate varied lookup table schemas.
 */
export interface IReference {
  /** The target database table for the operation. */
  table: string;
  /** State identifier hash. */
  state: Uint8Array;
  /** Order execution state hash. */
  order_state: Uint8Array;
  /** Request classification hash. */
  request_type: Uint8Array;
  /** Cancellation origin hash. */
  cancel_source: Uint8Array;
  /** Order classification hash (normal, algo, etc.). */
  order_category: Uint8Array;
  /** Broker-specific reference string. */
  source_ref: string;
  /** Primary human-readable status. */
  status: TRequestState;
  /** Secondary mapping/transition status. */
  map_ref: TRequestState;
  /** Dynamic property support for varied referential schemas. */
  [key: string]: unknown;
};

/**
 * Adds seed references for foreign key integrity to the specified table.
 * 
 * Logic Flow:
 * 1. Inspects the first property of the `props` object.
 * 2. If the value is strictly `0`, it is automatically replaced with a 
 *    new 6-character hash. This allows JSON seeds to trigger hash generation.
 * 3. Performs an {@link Insert} with the `ignore` flag to prevent duplicate seeding.
 * 
 * @param table - The name of the referential table (e.g., `cancel_source`).
 * @param props - The key-value pairs representing the seed record.
 * @returns A promise resolving to the database operation result.
 */
export const Add = async (table: string, props: { [key: string]: any }) => {
  if (Object.keys(props).length) {
    // Legacy Seed Pattern: Values of 0 trigger cryptographic hash generation
    const firstKey = Object.keys(props)[0];
    props[firstKey] === 0 && (props[firstKey] = hashKey(6));
    
    const result = await Insert<IReference>(props, { table, ignore: true });
    return result;
  }
};

/**
 * Retrieves reference records matching the provided criteria.
 * 
 * @param props - Search parameters.
 * @param options - Query configuration, including the target `table`.
 * @returns An array of matching partial reference records or undefined.
 */
export const Fetch = async (props: Partial<IReference>, options: TOptions<IReference>): Promise<Array<Partial<IReference>> | undefined> => {
  const result = await Select<IReference>(props, options);
  return result.success ? result.data : undefined;
};

/**
 * Resolves a specific primary key (hash) for a reference record.
 * 
 * Note: This method assumes the primary key is the first column 
 * returned by the database query.
 * 
 * @template T - The expected return type (typically `Uint8Array`).
 * @param props - Search parameters (e.g., `{ source_ref: 'canceled_by_user' }`).
 * @param options - Query configuration, including the target `table`.
 * @returns The first value of the found record cast to type `T`, or undefined.
 */
export const Key = async <T>(props: Partial<IReference>, options: TOptions<IReference>): Promise<T | undefined> => {
  if (hasValues<Partial<IReference>>(props)) {
    const result = await Select<IReference>(props, options);
    return result.success && result.data?.length ? (Object.values(result.data[0])[0] as T) : undefined;
  }
  return undefined;
};
