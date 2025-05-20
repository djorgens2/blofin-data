//+--------------------------------------------------------------------------------------+
//|                                                                            candle.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { ICandleAPI } from "@api/candles";

import { Select, Modify } from "@db/query.utils";

export interface IKeyProps {
  instrument: Uint8Array;
  symbol: string;
  period: Uint8Array;
  timeframe: string;
  timestamp?: number;
  limit?: number;
}

export interface ICandle extends IKeyProps, RowDataPacket {
  base_currency?: Uint8Array;
  base_symbol?: string;
  quote_currency?: Uint8Array;
  quote_symbol?: string;
  bar_time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  vol_currency?: number;
  vol_currency_quote?: number;
  completed: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Updates all differences between local db and candle provider                         |
//+--------------------------------------------------------------------------------------+
export async function Update(modified: Array<ICandleAPI & IKeyProps>) {
  for (const update of modified) {
    await Modify(
      `UPDATE blofin.candle 
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
      `INSERT INTO blofin.candle 
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
export function Fetch(props: IKeyProps): Promise<Array<Partial<ICandle>>> {
  const { instrument, period, timestamp, limit } = props;
  let sql: string = `SELECT timestamp, open, high, low, close, volume, vol_currency, vol_currency_quote, completed
   FROM blofin.vw_candles
   WHERE instrument = ?	AND period = ? and timestamp > ?
   ORDER BY	timestamp DESC`;
  sql += limit ? ` LIMIT ${limit || 1}` : ``;
  return Select<ICandle>(sql, [instrument, period, timestamp || 0]);
}
