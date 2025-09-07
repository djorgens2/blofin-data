//+--------------------------------------------------------------------------------------+
//|                                                                            candle.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Modify, parseColumns } from "@db/query.utils";

export interface ICandle {
  instrument: Uint8Array;
  symbol: string;
  period: Uint8Array;
  timeframe: string;
  timestamp: string;
  limit: number;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
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

//+--------------------------------------------------------------------------------------+
//| Updates all differences between local db and candle provider                         |
//+--------------------------------------------------------------------------------------+
export const Update = async (modified: Array<Partial<ICandle>>) => {
  for (const update of modified) {
    const { instrument, period, bar_time, ...updates } = update;
    const [fields, args] = parseColumns(updates);
    const sql = `UPDATE blofin.candle SET ${fields.join(", ")} WHERE instrument = ? AND period = ? AND bar_time = ?`;

    args.push(instrument, period, bar_time);

    try {
      await Modify(sql, args);
    } catch (e) {
      console.log({ sql, args, update });
      console.log(e);
    }
  }
};

//+--------------------------------------------------------------------------------------+
//| Inserts new candles retrieved from the blofin rest api;                              |
//+--------------------------------------------------------------------------------------+
export const Insert = async (missing: Array<Partial<ICandle>>) =>{
  for (const insert of missing) {
    const [fields, args] = parseColumns(insert, "");
    const sql = `INSERT INTO blofin.candle (${fields.join(", ")}) VALUES (${Array(args.length).fill("?").join(", ")})`;

    try {
      await Modify(sql, args);
    } catch (e) {
      console.log({ sql, args, insert });
      console.log(e);
    }
  }
}

//+--------------------------------------------------------------------------------------+
//| Returns all candles meeting the mandatory instrument/period requirements;            |
//+--------------------------------------------------------------------------------------+
export const Fetch = (candle: Partial<ICandle>): Promise<Array<Partial<ICandle>>> => {
  const { limit, timestamp, ...filtered } = candle;
  const [fields, args] = parseColumns(filtered);
  const sql = `SELECT * FROM blofin.vw_candles ${fields.length ? "WHERE ".concat(fields.join(" AND ")) : ""}${
    timestamp ? ` AND bar_time >= ?` : ``
  } ORDER BY bar_time DESC${limit ? ` LIMIT ${limit || 1}` : ``}`;

  timestamp && args.push(new Date(parseInt(timestamp || "0")));

  return Select<ICandle>(sql, args);
};
