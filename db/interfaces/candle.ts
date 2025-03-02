//+------------------------------------------------------------------+
//|                                                        candle.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { IInstrumentPeriod } from "@db/interfaces/instrument_period";
import type { ICandleAPI } from "@/api/candles";

import { Select, Modify } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface ICandle extends RowDataPacket {
  instrument: number;
  instrument_pair: string;
  base_currency: number;
  base_symbol: string;
  quote_currency: number;
  quote_symbol: string;
  period: number;
  timeframe: string;
  time: number;
  bar_time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vol_currency: number;
  vol_currency_quote: number;
  completed: boolean;
}

export async function Publish(instrument: Partial<IInstrumentPeriod>, candle: ICandleAPI): Promise<number> {
  const set = await Modify(
    `REPLACE INTO candle SET instrument = ?, period = ?, bar_time = FROM_UNIXTIME(?/1000), open = ?, high = ?, low = ?, close = ?,
        volume = ?, vol_currency = ?, vol_currency_quote = ?, completed = ?`,
    [
      instrument.instrument,
      instrument.period,
      candle.ts,
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.vol,
      candle.volCurrency,
      candle.volCurrencyQuote,
      candle.confirm,
    ]
  );

  return set.insertId;
}

export function Fetch(instrument: number, period: number) {
  return Select<ICandle>(
    `SELECT time, open, high, low, close, volume, vol_currency, vol_currency_quote, completed
     FROM vw_candles
     WHERE instrument = ?	AND period = ? ORDER BY	bar_time;`,
    [instrument, period]
  );
}
