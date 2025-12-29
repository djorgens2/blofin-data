//+--------------------------------------------------------------------------------------+
//|                                                                          currency.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ISymbol } from "db/interfaces/state";
import type { IPublishResult, TResponse } from "db/query.utils";

import { Select, Insert, Update, PrimaryKey } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues, isEqual } from "lib/std.util";

import * as States from "db/interfaces/state";

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
export const Publish = async (props: Partial<ICurrency>) => {
  if (props && (props.symbol || props.currency)) {
    const currency = await Fetch(props.currency ? { currency: props.currency } : { symbol: props.symbol });
    const state = props.state || await States.Key({ status: props.status ? "Suspended" : "Enabled" });

    if (currency) {
      const [current] = currency;
      const result: TResponse = await Update<ICurrency>(
        {
          currency: current.currency,
          state: isEqual(state!, current.state!) ? undefined : state,
          image_url: props.image_url ? (props.image_url === current.image_url ? undefined : props.image_url) : undefined,
        },
        { table: `currency`, keys: [{ key: `currency` }] }
      );
      return { key: PrimaryKey(current, ["currency"]), response: result };
    }
    const missing = {
      currency: hashKey(6),
      symbol: props.symbol,
      state: state || (await States.Key({ status: "Enabled" })),
      image_url: `./public/images/currency/no-image.png`,
    };
    const result = await Insert<ICurrency>(missing, { table: `currency` });
    return { key: PrimaryKey(missing, ["currency"]), response: result };
  } else {
    return { key: undefined, response: { success: false, code: 400, category: `null_query`, rows: 0 } };
  }
};

//+--------------------------------------------------------------------------------------+
//| Examines currency search methods in props; executes first in priority sequence;      |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<ICurrency>): Promise<ICurrency["currency"] | undefined> => {
  if (hasValues<Partial<ICurrency>>(props)) {
    const [result] = await Select<ICurrency>(props, { table: `vw_currency` });
    return result ? result.currency : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns contract types meeting supplied criteria; all on prop set {};                |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<ICurrency>): Promise<Array<Partial<ICurrency>> | undefined> => {
  const result = await Select<ICurrency>(props, { table: `vw_currency` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Suspends currency on receipt of an 'unalive' state from Blofin;                      |
//+--------------------------------------------------------------------------------------+
export const Suspend = async (props: Array<Partial<ICurrency>>) => {
  if (props.length) {
    console.log(`-> Currency:Suspend: ${props.length} currencies to suspend`);

    const state = await States.Key<ISymbol>({ status: "Suspended" });
    const counts = {
      success: 0,
      errors: 0,
    };

    for (const suspense of props) {
      const { currency, symbol } = suspense;
      const keys = [];
      const columns = {
        currency: currency || undefined,
        symbol: symbol || undefined,
        state,
      };

      currency && keys.push({ key: `currency` });
      symbol && keys.push({ key: `symbol` });

      const result = await Update(columns, { table: `currency`, keys });
      result.success ? counts.success++ : counts.errors++;
    }

    console.log(`   # Suspensions processed [${props.length}]:  ${counts.success} ok${counts.errors ? `; errors: ${counts.errors}` : ``}`);
  }
};
