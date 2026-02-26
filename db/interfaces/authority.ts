/**
 * System Privilege and Permission Management.
 * 
 * Defines the granular authorities (privileges) available within the system
 * and their associated execution priority.
 * 
 * @module db/authority
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a specific system authority or privilege.
 */
export interface IAuthority {
  /** Primary Key: Unique 6-character hash identifier. */
  authority: Uint8Array;
  /** The name of the privilege (e.g., "READ_ACCOUNT", "EXECUTE_TRADE"). */
  privilege: string;
  /** Numerical ranking to determine override or execution order. */
  priority: number;
}

/**
 * Persists a new authority record to the database.
 * 
 * Logic Flow:
 * 1. Generates a new 6-character unique hash for the authority.
 * 2. Assigns the hash to the provided properties object.
 * 3. Inserts the record into the `authority` table.
 * 
 * @param props - Authority details including `privilege` name and `priority`.
 * @returns A promise resolving to the publication result and the new primary key.
 */
export const Add = async (props: Partial<IAuthority>): Promise<IPublishResult<IAuthority>> => {
  Object.assign(props, { authority: hashKey(6) });
  const result = await Insert<IAuthority>(props, { table: `authority`, ignore: true, context: "Authority.Add" });
  return { key: PrimaryKey(props, ["authority"]), response: result };
};

/**
 * Searches for an authority's unique primary key based on provided criteria.
 * 
 * @param props - Search parameters (e.g., specific `privilege` string).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IAuthority>): Promise<IAuthority["authority"] | undefined> => {
  if (hasValues<Partial<IAuthority>>(props)) {
    const result = await Select<IAuthority>(props, { table: `authority` });
    return result.success && result.data?.length ? result.data[0].authority : undefined;
  } else return undefined;
};

/**
 * Retrieves a collection of authority records matching the supplied criteria.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all authorities.
 * @returns An array of partial authority records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IAuthority>): Promise<Array<Partial<IAuthority>> | undefined> => {
  const result = await Select<IAuthority>(props, { table: `authority` });
  return result.success ? result.data : undefined;
};
