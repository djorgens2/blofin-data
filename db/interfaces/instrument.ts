//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ICurrency } from "db/interfaces/currency";
import type { TSymbol } from "db/interfaces/state";

import { Select, Insert, Update, TOptions } from "db/query.utils";
import { splitSymbol } from "lib/app.util";
import { hashKey } from "lib/crypto.util";
import { isEqual } from "lib/std.util";

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
}

//+--------------------------------------------------------------------------------------+
//| Publishes new instruments to the database; returns Key                               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrument>) => {
  if (props.instrument === undefined) {
    const [base_symbol, quote_symbol] = splitSymbol(props.symbol!) || [props.base_symbol, props.quote_symbol || `USDT`];
    const instrument: Partial<IInstrument> = {
      instrument: hashKey(6),
      trade_period: props.trade_period || (await Periods.Key({ timeframe: `15m` })),
      base_currency: props.base_currency || (await Currency.Key({ symbol: base_symbol })),
      quote_currency: props.quote_currency || (await Currency.Key({ symbol: quote_symbol })),
      margin_mode: props.margin_mode || "cross",
      leverage: props.leverage || 10,
      lot_scale_factor: props.lot_scale_factor || 1,
      martingale_factor: props.martingale_factor || 1,
    };
    const result = await Insert<IInstrument>(instrument, { table: `instrument` });
    return result ? result.instrument : undefined;
  } else {
    const instrument = await Fetch({ instrument: props.instrument });

    if (instrument === undefined) throw new Error(`Unathorized instrument publication; instrument not found`);
    else {
      const [current] = instrument;
      const revised: Partial<IInstrument> = {
        instrument: current.instrument,
        trade_period: isEqual(props.trade_period!, current.trade_period!) ? undefined : props.trade_period,
        margin_mode: props.margin_mode === current.margin_mode ? undefined : props.margin_mode,
        leverage: isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
        lot_scale_factor: isEqual(props.lot_scale_factor!, current.lot_scale_factor!) ? undefined : props.lot_scale_factor,
        martingale_factor: isEqual(props.martingale_factor!, current.martingale_factor!) ? undefined : props.martingale_factor,
      };
      const [result] = await Update(revised, { table: `instrument`, keys: [{ key: `instrument` }] });
      return result ? result.instrument : undefined;
    }
  }
};

//+--------------------------------------------------------------------------------------+
//| Returns an instrument key using supplied params;                                     |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IInstrument>): Promise<IInstrument["instrument"] | undefined> => {
  if (Object.keys(props).length) {
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
        Currency.Suspend(suspense);
        return suspense;
      }
    } else return undefined;
  } else return undefined;
};
