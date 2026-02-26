/**
 * Broker and Exchange Metadata Management.
 * 
 * Defines the supported trading platforms, including their branding 
 * assets and reference URLs used across the system.
 * 
 * @module db/broker
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a supported cryptocurrency broker or exchange.
 */
export interface IBroker {
  /** Primary Key: Unique 6-character hash identifier. */
  broker: Uint8Array;
  /** Human-readable name of the exchange (e.g., "Blofin", "Binance"). */
  name: string;
  /** URL to the broker's branding logo. */
  image_url: string;
  /** URL to the broker's official website. */
  website_url: string;
}

/**
 * Persists a new broker record to the database.
 * 
 * Logic Flow:
 * 1. Generates a new 6-character unique hash for the broker.
 * 2. Assigns the hash to the provided properties object.
 * 3. Inserts the record into the `broker` table.
 * 
 * @param props - Broker details including `name` and asset URLs.
 * @returns A promise resolving to the publication result and the new primary key.
 */
export const Add = async (props: Partial<IBroker>): Promise<IPublishResult<IBroker>> => {
  Object.assign(props, { broker: hashKey(6) });
  const result = await Insert<IBroker>(props, { table: `broker`, ignore: true, context: "Broker.Add" });
  return { key: PrimaryKey(props, ["broker"]), response: result };
};

/**
 * Searches for a broker's unique primary key based on provided criteria.
 * Commonly used during account initialization to resolve name to hash.
 * 
 * @param props - Search parameters (e.g., specific `name` string).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IBroker>): Promise<IBroker["broker"] | undefined> => {
  if (hasValues<Partial<IBroker>>(props)) {
    const result = await Select<IBroker>(props, { table: `broker` });
    return result.success && result.data?.length ? result.data[0].broker : undefined;
  }
  return undefined;
};

/**
 * Retrieves a collection of broker records matching the supplied criteria.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all brokers.
 * @returns An array of partial broker records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IBroker>): Promise<Array<Partial<IBroker>> | undefined> => {
  const result = await Select<IBroker>(props, { table: `broker` });
  return result.success ? result.data : undefined;
};
