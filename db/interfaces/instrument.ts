//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TSymbol } from "db/interfaces/state";
import type { ICurrency } from "db/interfaces/currency";
import type { IPublishResult, TOptions } from "db/query.utils";

import { Select, Insert, PrimaryKey, Distinct } from "db/query.utils";
import { splitSymbol } from "lib/app.util";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

import * as Currency from "db/interfaces/currency";

export interface IInstrument {
  instrument: Uint8Array;
  symbol: string;
  base_currency: Uint8Array;
  base_symbol: string;
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
  digits: number;
  state: Uint8Array;
  status: TSymbol;
  list_time: Date;
  expiry_time: Date;
  update_time: Date;
  create_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Publishes new instruments to the database; returns Key                               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrument>): Promise<IPublishResult<IInstrument>> => {
  if (!props.symbol) {
    return { key: undefined, response: { success: false, code: 412, response: `null_query`, rows: 0, context: "Instrument.Publish" } };
  }

  const instrument = await Key({ symbol: props.symbol });

  if (instrument) {
    return { key: PrimaryKey({ instrument }, [`instrument`]), response: { success: true, code: 201, response: `exists`, rows: 0, context: "Instrument.Publish" } };
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

//+--------------------------------------------------------------------------------------+
//| Returns an instrument key using supplied params;                                     |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IInstrument>): Promise<IInstrument["instrument"] | undefined> => {
  if (hasValues<Partial<IInstrument>>(props)) {
    const [result] = await Select<IInstrument>(props, { table: `vw_instruments` });
    return result ? result.instrument : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns instruments meeting supplied criteria; returns all on empty set {};          |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IInstrument>, options?: TOptions): Promise<Array<Partial<IInstrument>> | undefined> => {
  const result = await Select<IInstrument>(props, { ...options, table: options?.table || `vw_instruments` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Audits instrument records for discrepancies; returns array of corrected instruments; |
//+--------------------------------------------------------------------------------------+
export const Suspense = async (props: Array<Partial<IInstrument>>): Promise<Array<IPublishResult<ICurrency>>> => {
  if (!hasValues(props)) {
    return [{ key: undefined, response: { success: false, code: 400, response: `null_query`, rows: 0, context: "Instrument.Suspense" } }];
  }
  
  const current = await Distinct<IInstrument>(
    { symbol: undefined, base_currency: undefined, status: `Suspended` },
    { table: `vw_instruments`, keys: [{ key: `status`, sign: "<>" }] }
  );
  const api = props.filter((p) => p.status === `Enabled`);
  const suspense = current
    .filter((db) => !api.some((suspend) => suspend.symbol === db.symbol))
    .map((instrument) =>
      Currency.Publish({
        currency: instrument.base_currency,
        status: `Suspended`,
      })
    );

  const results = await Promise.all(suspense);
  console.log(`-> Instrument.Suspense: Found ${suspense.length} instruments to suspend`);
  return results as Array<IPublishResult<ICurrency>>;
};
