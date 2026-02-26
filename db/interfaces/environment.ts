/**
 * System Environment Configuration.
 * 
 * Defines the operational contexts for the application, such as 
 * 'Live', 'Paper', or 'Sandbox', allowing for environment-specific 
 * account and API routing.
 * 
 * @module db/environment
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a specific system environment.
 */
export interface IEnvironment {
  /** Primary Key: Unique 6-character hash identifier. */
  environment: Uint8Array;
  /** Human-readable name of the environment (e.g., "Live", "Demo"). */
  environ: string;
  /** Detailed description of the environment's purpose or constraints. */
  description: string;
}

/**
 * Persists a new environment record to the database.
 * 
 * Logic Flow:
 * 1. Generates a new 6-character unique hash for the environment.
 * 2. Assigns the hash to the provided properties object.
 * 3. Inserts the record into the `environment` table.
 * 
 * @param props - Environment details including `environ` name and `description`.
 * @returns A promise resolving to the publication result and the new primary key.
 */
export const Add = async (props: Partial<IEnvironment>): Promise<IPublishResult<IEnvironment>> => {
  Object.assign(props, { environment: hashKey(6) });
  const result = await Insert<IEnvironment>(props, { table: `environment`, ignore: true, context: "Environment.Add" });
  return { key: PrimaryKey(props, ["environment"]), response: result };
};

/**
 * Searches for an environment's unique primary key based on provided criteria.
 * Typically used to resolve the `environ` string to its internal hash.
 * 
 * @param props - Search parameters (e.g., specific `environ` name).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IEnvironment>): Promise<IEnvironment["environment"] | undefined> => {
  if (hasValues<Partial<IEnvironment>>(props)) {
    const result = await Select<IEnvironment>(props, { table: `environment` });
    return result.success && result.data?.length ? result.data[0].environment : undefined;
  }
  return undefined;
};

/**
 * Retrieves a collection of environment records matching the supplied criteria.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all environments.
 * @returns An array of partial environment records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IEnvironment>): Promise<Array<Partial<IEnvironment>> | undefined> => {
  const result = await Select<IEnvironment>(props, { table: `environment` });
  return result.success ? result.data : undefined;
};
