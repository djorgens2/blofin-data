//+------------------------------------------------------------------+
//|                                                    instrument.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { State } from "@db/interfaces/trade_state";
import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

import * as Currency from "db/interfaces/currency";
import * as TradeState from "@db/interfaces/trade_state";
import { hex, splitSymbol } from "@/lib/std.util";

export interface IKeyProps {
  currencyPair?: string;
  symbol?: Array<string>;
  currency?: Array<number>;
};

export interface IInstrument extends RowDataPacket {
  instrument: number;
  currency_pair: string;
  base_currency: number;
  base_symbol: string;
  quote_currency: number;
  quote_symbol: string;
  trade_period: number;
  trade_timeframe: string;
  timeframe_units: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  contract_value: number;
  max_leverage: number;
  min_size: number;
  lot_size: number;
  tick_size: number;
  digits: number;
  max_limit_size: number;
  max_market_size: number;
  trade_state: number;
  state: string;
  suspense: boolean;
}

export async function Publish(baseCurrency: number, quoteCurrency: number): Promise<number> {
  const [baseSymbol, quoteSymbol] = await Promise.all([Currency.Symbol(baseCurrency), Currency.Symbol(quoteCurrency)]);
  const [instrument] = await Select<IInstrument>("SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?", [
    baseCurrency,
    quoteCurrency,
  ]);

  if (instrument === undefined) {
    if (baseSymbol === undefined || quoteSymbol === undefined) return 0;

    const key = UniqueKey(6);
    const tradeState = await TradeState.Key(State.Disabled);
    const instrument = await Modify(`INSERT INTO instrument (instrument, base_currency, quote_currency, trade_state) VALUES (UNHEX(?), ?, ?, ?)`, [
      key,
      baseCurrency,
      quoteCurrency,
      tradeState,
    ]);

    return instrument.insertId;
  }

  return instrument.instrument!;
}

export function Fetch(instrument: number) {
  return Select<IInstrument>(`SELECT * FROM vw_instruments WHERE instrument = ?`, [instrument]);
}

export async function Key(props: IKeyProps): Promise<number> {
  const args = [];

  if (props.currency?.length === 2) {
    args.push(hex(props.currency[0]),hex(props.currency[1]),`SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?`);
  } else {
    const symbol: Array<string> = props.symbol?.length === 2 ? [props.symbol[0], props.symbol[1]] : props.currencyPair === undefined ? ['',''] : splitSymbol(props.currencyPair!);
    args.push(symbol[0],symbol[1],`SELECT instrument FROM vw_instruments WHERE base_symbol = ? AND quote_symbol = ?`);
  }

  const [key] = await Select<IInstrument>(args[2].toString(), args.slice(0,2));
  // const [key] = await Select<IInstrument>(`SELECT instrument FROM vw_instruments WHERE base_symbol = ? AND quote_symbol = ?`, [symbol[0], symbol[1]]);
  return key.instrument!;
}

export function Symbol(currency_pair: string) {
  return Select<IInstrument>(`SELECT * FROM vw_instruments WHERE currency_pair = ?`, [currency_pair]);
}

export function FetchActive() {
  return Select<IInstrument>(
    `SELECT instrument, currency_pair, trade_period, trade_timeframe, sma_factor, data_collection_rate, digits
       FROM vw_instruments WHERE data_collection_rate > 0 AND suspense = false`,
    []
  );
}
