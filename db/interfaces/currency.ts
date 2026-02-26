/**
 * Global Currency and Asset Symbol Management.
 * 
 * Serves as the central registry for all traded assets (BTC, USDT, etc.). 
 * Manages asset lifecycle states, branding assets, and provides recursive 
 * lookup capabilities for higher-level modules like Balances and Instruments.
 * 
 * @module db/currency
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { ISymbol } from "#db/interfaces/state";
import type { IPublishResult, TResponse } from "#api";
import type { TKey } from "#db";
import { Select, Insert, Update, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues, isEqual } from "#lib/std.util";
import * as States from "#db/interfaces/state";

/**
 * Interface representing a financial currency or token asset.
 */
export interface ICurrency {
  /** Primary Key: Unique 6-character hash identifier. */
  currency: Uint8Array;
  /** The asset's ticker symbol (e.g., "BTC", "ETH"). */
  symbol: string;
  /** Foreign Key: Current operational state hash. */
  state: Uint8Array;
  /** Human-readable status (e.g., "Enabled", "Suspended"). */
  status: string;
  /** Local or remote URL for the asset's icon. */
  image_url: string;
}

/**
 * Synchronizes currency records with incoming broker data.
 * 
 * Logic Flow:
 * 1. Checks for existence via `currency` hash or `symbol` string.
 * 2. If exists: Updates the `state` or `image_url` only if they differ from stored values.
 * 3. If missing: Generates a new 6-character hash and initializes the asset 
 *    with a default "no-image" placeholder.
 * 
 * @param props - Partial currency data. Requires `symbol` or `currency` hash.
 * @returns A promise resolving to the publication result and the primary key.
 */
export const Publish = async (props: Partial<ICurrency>): Promise<IPublishResult<ICurrency>> => {
  const context = "Currency.Publish";
  if (!props || !(props.symbol || props.currency)) {
    return { key: undefined, response: { success: false, code: 411, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context } };
  }

  const currency = await Fetch(props.currency ? { currency: props.currency } : { symbol: props.symbol });
  const state = props.state || (await States.Key({ status: props.status ? "Suspended" : "Enabled" }));

  if (currency) {
    const [current] = currency;
    const result: TResponse = await Update<ICurrency>(
      {
        currency: current.currency,
        state: isEqual(state!, current.state!) ? undefined : state,
        image_url: props.image_url ? (props.image_url === current.image_url ? undefined : props.image_url) : undefined,
      },
      { table: `currency`, keys: [[`currency`]], context },
    );

    return { key: PrimaryKey(current, ["currency"]), response: result };
  }

  const missing: Partial<ICurrency> = {
    currency: hashKey(6),
    symbol: props.symbol,
    state: state || (await States.Key({ status: "Enabled" })),
    image_url: `./public/images/currency/no-image.png`,
  };
  const result = await Insert<ICurrency>(missing, { table: `currency`, context });

  return { key: PrimaryKey(missing, ["currency"]), response: result };
};

/**
 * Resolves a currency's unique primary key based on provided criteria.
 * Queries the `vw_currency` view for optimized retrieval.
 * 
 * @param props - Search parameters (e.g., `symbol` or `currency` hash).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<ICurrency>): Promise<ICurrency["currency"] | undefined> => {
  if (hasValues<Partial<ICurrency>>(props)) {
    const result = await Select<ICurrency>(props, { table: `vw_currency` });
    return result.success && result.data?.length ? result.data[0].currency : undefined;
  }
  return undefined;
};

/**
 * Retrieves a collection of currency records matching the supplied criteria.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all currencies.
 * @returns An array of partial currency records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<ICurrency>): Promise<Array<Partial<ICurrency>> | undefined> => {
  const result = await Select<ICurrency>(props, { table: `vw_currency` });
  return result.success ? result.data : undefined;
};

/**
 * Batches the suspension of multiple currencies/symbols.
 * 
 * Typically used during market audits or maintenance windows to move 
 * assets into a restricted 'Suspended' state.
 * 
 * @param props - Array of currencies or symbols to be suspended.
 * @returns A promise resolving to an array of individual publication results.
 */
export const Suspend = async (props: Array<Partial<ICurrency>>): Promise<Array<IPublishResult<ICurrency>>> => {
  if (!props.length) return [];

  console.log(`-> Currency:Suspend [API] Processing ${props.length} items`);

  const context = "Currency.Suspend";
  const suspended = await States.Key<ISymbol>({ status: "Suspended" });

  return await Promise.all(
    props.map(async (suspense): Promise<IPublishResult<ICurrency>> => {
      try {
        const { currency, symbol } = suspense;
        const keys: Array<TKey<ICurrency>> = [];

        currency && keys.push(["currency"]);
        symbol && keys.push(["symbol"]);

        if (keys.length === 0) {
          throw new Error("Missing identifying keys (currency/symbol)");
        }

        const result = await Update<ICurrency>({ currency, symbol, state: suspended }, { table: "currency", keys, context });

        return {
          key: PrimaryKey(suspense, ["currency"]),
          response: result,
        };
      } catch (error) {
        return {
          key: undefined,
          response: {
            success: false,
            code: -1,
            state: "error",
            message: error instanceof Error ? error.message : "Suspension failure",
            rows: 0,
            context: "Currency.Suspend",
          },
        };
      }
    }),
  );
};
