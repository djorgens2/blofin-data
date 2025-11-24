//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ICurrency } from "db/interfaces/currency";
import type { TSymbol } from "db/interfaces/state";

import { Select, Insert, Update } from "db/query.utils";
import { splitSymbol } from "lib/app.util";
import { hashKey } from "lib/crypto.util";
import { hasValues, isEqual } from "lib/std.util";

import * as Currency from "db/interfaces/currency";
import * as Periods from "db/interfaces/period";

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
  margin_mode: string;
  leverage: number;
  max_leverage: number;
  min_size: number;
  max_limit_size: number;
  max_market_size: number;
  lot_size: number;
  lot_scale_factor: number;
  tick_size: number;
  digits: number;
  martingale_factor: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  trade_period: Uint8Array;
  trade_timeframe: string;
  timeframe_units: number;
  state: Uint8Array;
  status: TSymbol;
  list_time: Date;
  expiry_time: Date;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Publishes new instruments to the database; returns Key                               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrument>) => {
  const instrument = await Key(props);

  if (instrument) {
    const results = await Fetch({ instrument });

    if (results) return instrument;
    else throw new Error(`Unathorized instrument publication; instrument not found`);
  } else {
    const [base_symbol, quote_symbol] = splitSymbol(props.symbol!) || [props.base_symbol, props.quote_symbol || `USDT`];
    const instrument: Partial<IInstrument> = {
      instrument: hashKey(6),
      base_currency: props.base_currency || (await Currency.Publish({ symbol: base_symbol })),
      quote_currency: props.quote_currency || (await Currency.Publish({ symbol: quote_symbol })),
      create_time: new Date(),
      update_time: new Date(),
    };
    const result = await Insert<IInstrument>(instrument, { table: `instrument` });
    return result ? result.instrument : undefined;
  }
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
export const Fetch = async (props: Partial<IInstrument>): Promise<Array<Partial<IInstrument>> | undefined> => {
  const result = await Select<IInstrument>(props, { table: `vw_instruments` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Audits instrument records for discrepancies; returns array of corrected instruments; |
//+--------------------------------------------------------------------------------------+
export const Suspense = async (props: Array<IInstrument["instrument"]>) => {
  if (props.length) {
    const local = await Select<IInstrument>({ status: `Suspended` }, { table: `vw_instruments`, keys: [{ key: `status`, sign: "<>" }] });
    const missing = local && local.filter((db) => !props.some((api) => isEqual(api, db.instrument!)));

    if (missing) {
      const suspense: Array<Partial<ICurrency>> = missing
        .filter((instrument) => instrument.status !== `Suspended`)
        .map((instrument) => ({
          currency: instrument.base_currency!,
          symbol: instrument.base_symbol!,
        }));

      if (suspense && suspense.length) {
        await Currency.Suspend(suspense);
        return suspense;
      }
    } else return undefined;
  } else return undefined;
};
