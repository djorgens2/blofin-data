/**
 * Global state management for system operations, requests, and positions.
 * @packageDocumentation
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult } from "#api";
import type { TOptions } from "#db";
import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/** Represents the operational status of the core system. */
export type TSystem = "Enabled" | "Disabled" | "Halted";

/** Possible states for a processing request lifecycle. */
export type TRequestState = "Expired" | "Queued" | "Pending" | "Fulfilled" | "Rejected" | "Canceled" | "Hold" | "Closed";

/** Current status of a market or trade position. */
export type TPositionState = "Open" | "Closed";

/** User or entity access permissions level. */
export type TAccess = "Enabled" | "Disabled" | "Restricted" | "Suspended" | "Deleted";

/** Status of a specific trading symbol or asset. */
export type TSymbol = "Enabled" | "Disabled" | "Suspended";

/** Union of all possible state types within the system. */
export type TStates = TRequestState | TSystem | TAccess | TPositionState | TSymbol;

/** Base interface for system state records. */
export type IState = {
  /** Unique 6-character hashed identifier. */
  state: Uint8Array;
  /** The current status value. */
  status: TStates;
  /** Human-readable details about the state. */
  description: string;
};

/** Specialized state interface for Request objects. */
export interface IRequestState extends IState {
  status: TRequestState;
}

/** Specialized state interface for Access control objects. */
export interface IAccess extends IState {
  status: TAccess;
}

/** Specialized state interface for Symbol objects. */
export interface ISymbol extends IState {
  status: TSymbol;
}

/**
 * Persists a new state entry to the local database.
 * Generates a unique 6-character key automatically.
 *
 * @param props - Partial state object containing at least status and description.
 * @returns A promise resolving to the publication result including the new primary key.
 */
export const Add = async (props: Partial<IState>): Promise<IPublishResult<IState>> => {
  Object.assign(props, { state: hashKey(6) });
  const result = await Insert<IState>(props, { table: `state`, ignore: true });
  return { key: PrimaryKey(props, ["state"]), response: result };
};

/**
 * Retrieves the unique 'state' key for a record matching the provided criteria.
 *
 * @template T - The specific state interface being queried.
 * @param props - Search parameters used to find the record.
 * @returns The Uint8Array key if found, otherwise undefined.
 */
export const Key = async <T extends IState>(props: Partial<T>): Promise<T["state"] | undefined> => {
  if (hasValues<Partial<T>>(props)) {
    const result = await Select<T>(props, { table: `state` });
    return result.success ? result.data?.[0].state : undefined;
  } 
  return undefined;
};

/**
 * Fetches multiple state records based on filter criteria and database options.
 *
 * @template T - The specific state interface being fetched.
 * @param props - Filter criteria for the selection.
 * @param options - Additional database query options (limit, offset, etc.).
 * @returns An array of matching partial state records, or undefined if the query fails.
 */
export const Fetch = async <T extends IState>(props: Partial<T>, options?: TOptions<IState>): Promise<Array<Partial<T>> | undefined> => {
  const result = await Select<T>(props, { ...options, table: `state` });
  return result.success ? result.data : undefined;
};
