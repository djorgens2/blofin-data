//+--------------------------------------------------------------------------------------+
//|                                                                            candle.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { ICandleAPI } from "@/api/candles";

import { Select, Modify } from "@db/query.utils";

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
//| Inserts new candles retrieved from the blofin rest api;                              |
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

//+--------------------------------------------------------------------------------------+
//| Returns all candles meeting the mandatory instrument/period requirements;            |
//+--------------------------------------------------------------------------------------+
export function Fetch(props: IKeyProps, limit: number = 0): Promise<Array<Partial<ICandle>>> {
  return Select<ICandle>(
    `SELECT timestamp, open, high, low, close, volume, vol_currency, vol_currency_quote, completed
     FROM vw_candles
     WHERE instrument = ?	AND period = ?
     ORDER BY	timestamp DESC LIMIT ${limit || 1}`,
    [props.instrument, props.period]
  );
}

//+--------------------------------------------------------------------------------------+
//| Returns all candles meeting the mandatory instrument/period requirements;            |
//+--------------------------------------------------------------------------------------+
export async function First(props: IKeyProps): Promise<Partial<ICandle>> {
  const [candle] = await Select<ICandle>(
    `SELECT * FROM vw_candles WHERE (instrument, period, bar_time) = (SELECT instrument, period, min(bar_time) FROM candle WHERE instrument = ? AND period = ?)`,
    [props.instrument, props.period]
  );
  return candle;
}
