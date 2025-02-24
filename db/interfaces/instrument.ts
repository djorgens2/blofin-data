//+------------------------------------------------------------------+
//|                                                    instrument.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict"

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface IInstrument extends RowDataPacket {
  instrument: number;
  currency_pair: string;
  base_currency: number;
  base_symbol: string;
  quote_currency: number;
  quote_symbol: string;
  trade_period: number;
  trade_timeframe: string;
  interval_period: number;
  interval_timeframe: string;
  data_collection_rate: number;
  sma_factor: number;
  contract_value: number;
  max_leverage: number;
  min_size: number;
  lot_size: number;
  tick_size: number;
  digits: number;
  max_limit_size: number;
  max_market_size: number;
  suspense: boolean;
}

export async function Publish(baseCurrency: number, quoteCurrency: number): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(`INSERT IGNORE INTO instrument (instrument, base_currency, quote_currency) VALUES (UNHEX(?),?,?)`, [key, baseCurrency, quoteCurrency]);
  const get = await Select<IInstrument>("SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?", [baseCurrency, quoteCurrency]);

  return get.length === 0 ? set.insertId : get[0].instrument!;
}

export function Fetch() {
  return Select<IInstrument>(`SELECT * FROM vw_instruments`, []);
}

export function FetchActive() {
  return Select<IInstrument>(
    `SELECT instrument, currency_pair, trade_period, trade_timeframe, sma_factor, data_collection_rate, digits
       FROM vw_instruments WHERE data_collection_rate > 0 AND suspense = false`,
    []
  );
}

export function FetchInactive() {
  return Select<IInstrument>(
    `SELECT * FROM vw_instruments WHERE data_collection_rate = 0 AND suspense = false`, []);
}

export function FetchSuspense() {
  return Select<IInstrument>(
    `SELECT * FROM vw_instruments WHERE suspense = true`, []);
}
