//+--------------------------------------------------------------------------------------+
//|                                                                          currency.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ISymbol } from "db/interfaces/state";

import { Select, Insert, Update } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { isEqual } from "lib/std.util";

import * as States from "db/interfaces/state";

export interface ICurrency {
  currency: Uint8Array;
  symbol: string;
  state: Uint8Array;
  status: string;
  image_url: string;
  suspense: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Adds all new currencies recieved from Blofin to the database; defaults image         |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<ICurrency>): Promise<ICurrency["currency"] | undefined> => {
  const currency = await Fetch(props.currency ? { currency: props.currency } : { symbol: props.symbol });
  const state = await States.Key(props.suspense ? { status: `Suspended` } : { status: "Enabled" });

  if (currency === undefined) {
    const result = await Insert<ICurrency>(
      {
        currency: hashKey(6),
        symbol: props.symbol,
        state,
        image_url: `./public/images/currency/no-image.png`,
      },
      { table: `currency` }
    );
    return result ? result.currency : undefined;
  }

  const [current] = currency;
  const [result] = await Update<ICurrency>(
    {
      currency: current.currency,
      state: isEqual(state!, current.state!) ? undefined : props.suspense ? state : await States.Key({ status: "Disabled" }),
      image_url: props.image_url ? (props.image_url === current.image_url ? undefined : props.image_url) : undefined,
    },
    { table: `currency`, keys: [{ key: `currency` }] }
  );
  return result ? result.currency : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Examines currency search methods in props; executes first in priority sequence;      |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<ICurrency>): Promise<ICurrency["currency"] | undefined> => {
  if (Object.keys(props).length) {
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

      const [result] = await Update(columns, { table: `currency`, keys });
      result ? counts.success++ : counts.errors++;
    }

    console.log(`   # Suspensions processed [${props.length}]:  ${counts.success} ok${counts.errors ? `; errors: ${counts.errors}` : ``}`);
  }
};
