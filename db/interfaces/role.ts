/**
 * Role Identity Management.
 * 
 * Defines and manages the organizational roles used for access control.
 * This module facilitates the creation of unique role identifiers and 
 * manages the 'auth_rank', which determines the hierarchical standing 
 * of a role within the security ecosystem.
 * 
 * @module db/role
 * @copyright 2018-2026, Dennis Jorgenson
 */
"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Represents a security Role and its associated authorization rank.
 */
export interface IRole {
  /** Unique binary identifier for the role. */
  role: Uint8Array;
  /** Human-readable name of the role (e.g., 'Administrator', 'Editor'). */
  title: string;
  /** Numerical value representing the authority level; used for hierarchical comparisons. */
  auth_rank: number;
}

/**
 * Registers a new security role within the local database.
 * 
 * Generates a unique 6-byte hash for the `role` property and performs an 
 * idempotent insertion. If the role already exists, the insertion is ignored.
 * 
 * @param props - Role attributes to persist.
 * @returns Result object containing the new primary key and database response metadata.
 */
export const Add = async (props: Partial<IRole>): Promise<IPublishResult<IRole>> => {
  Object.assign(props, { role: hashKey(6) });
  const result = await Insert<IRole>(props, { table: `role`, ignore: true });
  return { key: PrimaryKey(props, ["role"]), response: result };
};

/**
 * Locates a specific role identifier based on search criteria.
 * 
 * Queries the database for a role matching the provided parameters (e.g., title 
 * or auth_rank). Returns the binary key of the first matching record found.
 * 
 * @param props - Search parameters used to identify the role.
 * @returns The binary `role` key if found; otherwise undefined.
 */
export const Key = async (props: Partial<IRole>): Promise<IRole["role"] | undefined> => {
  if (hasValues<Partial<IRole>>(props)) {
    const result = await Select<IRole>(props, { table: `role` });
    return result.success && result.data?.length ? result.data[0].role : undefined;
  }
  return undefined;
};

/**
 * Fetches roles matching the supplied property filters.
 * 
 * Acts as a versatile retriever for role entities. Providing an empty 
 * property set `{}` will trigger a full retrieval of all roles in the system.
 * 
 * @param props - Filters used to narrow the result set.
 * @returns An array of partial role records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IRole>): Promise<Array<Partial<IRole>> | undefined> => {
  const result = await Select<IRole>(props, { table: `role` });
  return result.success ? result.data : undefined;
};
