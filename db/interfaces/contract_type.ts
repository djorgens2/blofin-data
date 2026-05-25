/**
 * Contract Type and Broker Mapping Management.
 *
 * Acts as a translation layer between broker-specific contract identifiers
 * (e.g., "SWAP", "FUTURES") and internal system hashes. This allows for
 * consistent logic across multiple exchanges.
 *
 * @module db/contract_type
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult, TResponse } from "#api";
import { Select, Insert, Update, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a specific type of financial contract.
 */
export interface IContractType {
  /** Primary Key: Unique 6-character hash identifier (or raw string during resolution). */
  contract_type: Uint8Array | string;
  /** The broker's original reference string (e.g., "linear_perpetual"). */
  source_ref: string;
  /** Human-readable description of the contract characteristics. */
  description: string;
}

/**
 * Synchronizes contract types by mapping broker references to internal hashes.
 *
 * Logic Flow:
 * 1. Sanitizes input to distinguish between internal hashes and external source strings.
 * 2. Checks for an existing mapping via {@link Key}.
 * 3. If exists: Updates the human-readable description if it has changed.
 * 4. If missing: Generates a new 6-character hash and establishes the mapping.
 *
 * @param props - Contract details, where `contract_type` may contain the broker's raw key.
 * @param context - Tracing context for logging.
 * @returns A promise resolving to the publication result and the mapped primary key.
 */
export const Publish = async (props: Partial<IContractType>, baseContext = "Contract.Type"): Promise<IPublishResult<IContractType>> => {
  const context = `${baseContext}.Publish`;

  if (!props.contract_type && !props.source_ref) {
    return { key: undefined, response: { success: false, code: 411, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context } };
  }

  const query = {
    contract_type: typeof props.contract_type === "string" ? undefined : props.contract_type,
    source_ref: typeof props.contract_type === "string" ? props.contract_type : props.source_ref,
  };

  const exists = await Fetch(query);

  if (exists) {
    const [current] = exists;
    const revised = {
      contract_type: current.contract_type,
      description: props.description?.length && props.description !== current.description ? props.description : undefined,
    };
    const result: TResponse = await Update<IContractType>(revised, { table: `contract_type`, keys: [[`contract_type`]], context });
    if (!result.success && result.code === 200 /* no update */) {
      Object.assign(result, { success: true, code: 201, state: `exists`, message: `[Info] ${context}: No update required.` });
    }

    return {
      key: PrimaryKey(current, ["contract_type"]),
      response: result,
    };
  }

  const missing = {
    contract_type: hashKey(6),
    source_ref: query.source_ref,
    description: props.description || "Description pending",
  };
  const result = await Insert<IContractType>(missing, { table: `contract_type`, context });

  return { key: PrimaryKey(missing, ["contract_type"]), response: result };
};

/**
 * Searches for an contract type based on provided criteria.
 *
 * @param props - Search parameters (e.g., `source_ref` string).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IContractType>): Promise<IContractType["contract_type"] | undefined> => {
  if (hasValues<Partial<IContractType>>(props)) {
    const result = await Select<IContractType>(props, { table: `contract_type` });
    return result.success && result.data?.length ? result.data[0].contract_type : undefined;
  }
  return undefined;
};

/**
 * Retrieves contract type records matching the supplied criteria.
 *
 * @param props - Filter criteria. Pass `{}` to retrieve all types.
 * @returns An array of partial contract type records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IContractType>): Promise<Array<Partial<IContractType>> | undefined> => {
  const result = await Select<IContractType>(props, { table: `contract_type` });
  return result.success ? result.data : undefined;
};
