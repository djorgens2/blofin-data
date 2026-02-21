//+--------------------------------------------------------------------------------------+
//|                                                                          currency.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ISymbol } from "#db/interfaces/state";
import type { IPublishResult, TResponse } from "#api";
import type { TKey } from "#db";

import { Select, Insert, Update, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues, isEqual } from "#lib/std.util";

import * as States from "#db/interfaces/state";

export interface ICurrency {
  currency: Uint8Array;
  symbol: string;
  state: Uint8Array;
  status: string;
  image_url: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds all new currencies recieved from Blofin to the database; defaults image         |
//+--------------------------------------------------------------------------------------+
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

//+--------------------------------------------------------------------------------------+
//| Examines currency search methods in props; executes first in priority sequence;      |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<ICurrency>): Promise<ICurrency["currency"] | undefined> => {
  if (hasValues<Partial<ICurrency>>(props)) {
    const result = await Select<ICurrency>(props, { table: `vw_currency` });
    return result.success && result.data?.length ? result.data[0].currency : undefined;
  }
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns contract types meeting supplied criteria; all on prop set {};                |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<ICurrency>): Promise<Array<Partial<ICurrency>> | undefined> => {
  const result = await Select<ICurrency>(props, { table: `vw_currency` });
  return result.success ? result.data : undefined;
};

/**
 * Suspends currencies/symbols and returns standardized IPublishResult objects
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
