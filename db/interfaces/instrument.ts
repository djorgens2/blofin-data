/**
 * Core management for trading instruments. 
 * Handles the creation of new market pairs and ensures underlying 
 * base/quote currencies are initialized in the database.
 * 
 * @packageDocumentation
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TSymbol } from "#db/interfaces/state";
import type { TOptions } from "#db";
import type { IPublishResult } from "#api";

import { Select, Insert, PrimaryKey } from "#db";
import { Currency } from "#db";

import { splitSymbol } from "#lib/app.util";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Interface representing a financial trading instrument (e.g., BTC/USDT).
 */
export interface IInstrument {
  /** Primary Key: Unique 6-character hash identifier. */
  instrument: Uint8Array;
  /** The full trading pair string (e.g., "ETH/BTC"). */
  symbol: string;
  /** Foreign Key: Reference to the base currency. */
  base_currency: Uint8Array;
  base_symbol: string;
  /** Foreign Key: Reference to the quote currency. */
  quote_currency: Uint8Array;
  quote_symbol: string;
  instrument_type: Uint8Array | string;
  contract_type: Uint8Array | string;
  contract_value: number;
  max_leverage: number;
  min_size: number;
  max_limit_size: number;
  max_market_size: number;
  lot_size: number;
  tick_size: number;
  /** Decimal precision for price display. */
  digits: number;
  state: Uint8Array;
  status: TSymbol;
  list_time: Date;
  expiry_time: Date;
  update_time: Date;
  create_time: Date;
}

/**
 * Registers a new instrument in the database if it does not already exist.
 * 
 * Logic flow:
 * 1. Checks if the symbol already exists via {@link Key}.
 * 2. If missing, splits the symbol (e.g., "BTC/USDT" -> "BTC", "USDT").
 * 3. Recursively ensures both base and quote currencies exist via `Currency.Publish`.
 * 4. Inserts the new instrument record with a unique hash.
 * 
 * @param props - Partial instrument data. `symbol` is required.
 * @param context - Debugging context for logging.
 * @returns A promise resolving to the publication result and primary key.
 */
export const Publish = async (props: Partial<IInstrument>, context = "Instruments"): Promise<IPublishResult<IInstrument>> => {
  context = `${context}.Publish`;
  if (!props.symbol) {
    return { key: undefined, response: { success: false, code: 412, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context } };
  }

  const instrument = await Key({ symbol: props.symbol });

  if (instrument) {
    return {
      key: PrimaryKey({ instrument }, [`instrument`]),
      response: { success: true, code: 201, state: `exists`, message: `[Error] ${context}:`, rows: 0, context },
    };
  }

  const [base_symbol, quote_symbol] = splitSymbol(props.symbol!) || [props.base_symbol, props.quote_symbol || `USDT`];
  const missing: Partial<IInstrument> = {
    instrument: hashKey(6),
    base_currency: props.base_currency || (await Currency.Publish({ symbol: base_symbol })).key?.currency,
    quote_currency: props.quote_currency || (await Currency.Publish({ symbol: quote_symbol })).key?.currency,
    create_time: new Date(),
  };
  const result = await Insert<IInstrument>(missing, { table: `instrument` });
  return { key: PrimaryKey(missing, [`instrument`]), response: result };
};

/**
 * Searches for an instrument's unique primary key based on provided criteria.
 * Queries the `vw_instruments` view for performance.
 * 
 * @param props - Criteria to match (usually `symbol`).
 * @returns The instrument hash key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IInstrument>): Promise<IInstrument["instrument"] | undefined> => {
  if (hasValues<Partial<IInstrument>>(props)) {
    const result = await Select<IInstrument>(props, { table: `vw_instruments` });
    return result.success && result.data?.length ? result.data[0].instrument : undefined;
  }
  return undefined;
};

/**
 * Retrieves a collection of instrument records.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all records.
 * @param options - Database query modifiers (limit, offset, table override).
 * @returns Array of matching instrument records or undefined.
 */
export const Fetch = async (props: Partial<IInstrument>, options?: TOptions<IInstrument>): Promise<Array<Partial<IInstrument>> | undefined> => {
  const result = await Select<IInstrument>(props, { ...options, table: options?.table || `vw_instruments` });
  return result.success ? result.data : undefined;
};
