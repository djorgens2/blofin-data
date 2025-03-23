//+------------------------------------------------------------------+
//|                                                        candle.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { ICandleAPI } from "@/api/candles";

import { Select, Modify } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface ICandle extends IKeyProps, RowDataPacket {
  bar_time: Date;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vol_currency: number;
  vol_currency_quote: number;
  completed: boolean;
}

export interface IKeyProps {
  instrument: Uint8Array;
  symbol: string;
  base_currency?: Uint8Array;
  base_symbol?: string;
  quote_currency?: Uint8Array;
  quote_symbol?: string;
  period: Uint8Array;
  timeframe: string;
}

//+--------------------------------------------------------------------------------------+
//| Updates instrument detail on all identified changes                                  |
//+--------------------------------------------------------------------------------------+
export async function Update(modified: Array<ICandleAPI & IKeyProps>) {
  for (const update of modified) {
    await Modify(
      `UPDATE candle 
            SET open = ?,
                high = ?,
                low = ?,
                close = ?,
                volume = ?,
                vol_currency = ?,
                vol_currency_quote = ?,
                completed = ?
          WHERE instrument = ?
            AND period = ?
            AND bar_time = FROM_UNIXTIME(?/1000)`,
      [
        update.open,
        update.high,
        update.low,
        update.close,
        update.vol,
        update.volCurrency,
        update.volCurrencyQuote,
        update.confirm,
        update.instrument,
        update.period,
        update.ts,
      ]
    );
  }
}

//+--------------------------------------------------------------------------------------+
//| Updates instrument detail on all identified changes                                  |
//+--------------------------------------------------------------------------------------+
export async function Insert(missing: Array<ICandleAPI & IKeyProps>) {
  for (const insert of missing) {
    await Modify(
      `INSERT INTO candle 
            SET instrument = ?,
                period = ?,
                bar_time = FROM_UNIXTIME(?/1000),
                open = ?,
                high = ?,
                low = ?,
                close = ?,
                volume = ?,
                vol_currency = ?,
                vol_currency_quote = ?,
                completed = ?`,
      [
        insert.instrument,
        insert.period,
        insert.ts,
        insert.open,
        insert.high,
        insert.low,
        insert.close,
        insert.vol,
        insert.volCurrency,
        insert.volCurrencyQuote,
        insert.confirm,
      ]
    );
  }
}

export async function Publish(instrument: Uint8Array, period: Uint8Array, candle: ICandleAPI) {
  const set = await Modify(
    `REPLACE INTO candle SET instrument = ?, period = ?, bar_time = FROM_UNIXTIME(?/1000), open = ?, high = ?, low = ?, close = ?,
        volume = ?, vol_currency = ?, vol_currency_quote = ?, completed = ?`,
    [instrument, period, candle.ts, candle.open, candle.high, candle.low, candle.close, candle.vol, candle.volCurrency, candle.volCurrencyQuote, candle.confirm]
  );
}

export function Fetch(props: IKeyProps, limit: number = 0) {
  return Select<ICandle>(
    `SELECT timestamp, open, high, low, close, volume, vol_currency, vol_currency_quote, completed
     FROM vw_candles
     WHERE instrument = ?	AND period = ?
     ORDER BY	timestamp DESC LIMIT ${limit}`,
    [props.instrument, props.period]
  );
}

export function FetchTimestamp(instrument: Uint8Array, period: Uint8Array, timestamp: number) {
  return Select<ICandle>(
    `SELECT timestamp, open, high, low, close, volume, vol_currency, vol_currency_quote, completed
     FROM vw_candles
     WHERE instrument = ?	AND period = ? AND timestamp > ? ORDER BY timestamp`,
    [instrument, period, timestamp]
  );
}

export function FetchFirst(instrument: Uint8Array, period: Uint8Array) {
  return Select<ICandle>(
    `SELECT timestamp as start_time, open, high, low, close, volume, vol_currency, vol_currency_quote, completed FROM vw_candles
     WHERE (instrument,period,timestamp) = (SELECT instrument,period,MIN(UNIX_TIMESTAMP(bar_time)) FROM candle WHERE instrument = ? AND period = ?
     GROUP BY instrument, period)`,
    [instrument, period]
  );
}
