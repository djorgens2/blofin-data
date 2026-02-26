/**
 * Instrument Classification and Broker Mapping.
 * 
 * Manages the translation of exchange-specific instrument categories 
 * (e.g., "SPOT", "SWAP", "OPTION") into internal system hashes. This allows 
 * the engine to process different asset classes through a unified interface.
 * 
 * @module db/instrument_type
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, Update, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a categorized type of trading instrument.
 */
export interface IInstrumentType {
  /** Primary Key: Unique 6-character hash identifier (or raw string during resolution). */
  instrument_type: Uint8Array | string;
  /** The broker's original reference string (e.g., "SPOT"). */
  source_ref: string;
  /** Human-readable details regarding the instrument category. */
  description: string;
}

/**
 * Synchronizes instrument categories by mapping broker references to internal hashes.
 * 
 * Logic Flow:
 * 1. Analyzes the input to determine if an internal hash or broker string was provided.
 * 2. Checks for an existing mapping via {@link Key}.
 * 3. If exists: Updates the `description` if a new one is provided and differs from the current record.
 * 4. If missing: Automatically provisions a new 6-character hash mapping for the `source_ref`.
 * 
 * @param props - Classification details, where `instrument_type` may contain the broker's raw string.
 * @param context - Tracing context for logging.
 * @returns A promise resolving to the publication result and the mapped primary key.
 */
export const Publish = async (props: Partial<IInstrumentType>, context = "Instrument.Type"): Promise<IPublishResult<IInstrumentType>> => {
  context = `${context}.Publish`;

  if (hasValues(props)) {
    const search = {
      instrument_type: typeof props.instrument_type === "string" ? undefined : props.instrument_type,
      source_ref: typeof props.instrument_type === "string" ? (props.instrument_type as string) : props.source_ref,
    };
    const exists = await Key(search);

    if (exists) {
      if (hasValues<Partial<IInstrumentType>>({ description: props.description })) {
        const [current] = (await Fetch({ instrument_type: exists })) ?? [];
        if (current) {
          const revised = {
            instrument_type: current.instrument_type,
            description: props.description ? (props.description === current.description ? undefined : props.description) : undefined,
          };
          const result = await Update<IInstrumentType>(revised, { table: `instrument_type`, keys: [[`instrument_type`]] });
          return { key: PrimaryKey(current, ["instrument_type"]), response: result };
        }
      }
      return {
        key: PrimaryKey({ instrument_type: exists }, ["instrument_type"]),
        response: { success: true, code: 201, state: `exists`, message: `[Error] ${context}:`, rows: 0, context },
      };
    } else {
      const missing = {
        instrument_type: hashKey(6),
        source_ref: search.source_ref,
        description: props.description || "Description pending",
      };
      const result = await Insert<IInstrumentType>(missing, { table: `instrument_type`, context });
      return { key: PrimaryKey(missing, ["instrument_type"]), response: result };
    }
  }
  return { key: undefined, response: { success: false, code: 411, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context } };
};

/**
 * Searches for an instrument type's unique primary key based on provided criteria.
 * 
 * @param props - Search parameters (e.g., `source_ref` string).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IInstrumentType>): Promise<IInstrumentType["instrument_type"] | undefined> => {
  if (hasValues<Partial<IInstrumentType>>(props)) {
    const result = await Select<IInstrumentType>(props, { table: `instrument_type` });
    return result.success && result.data?.length ? result.data[0].instrument_type : undefined;
  }
  return undefined;
};

/**
 * Retrieves instrument category records matching the supplied criteria.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all types.
 * @returns An array of partial category records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IInstrumentType>): Promise<Array<Partial<IInstrumentType>> | undefined> => {
  const result = await Select<IInstrumentType>(props, { table: `instrument_type` });
  return result.success ? result.data : undefined;
};
