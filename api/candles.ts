//+--------------------------------------------------------------------------------------+
//|                                                                           candles.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ICandle, IKeyProps } from "@db/interfaces/candle";

import * as Candle from "@db/interfaces/candle";
import { isEqual } from "@/lib/std.util";

export interface ICandleAPI {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  volCurrency: number;
  volCurrencyQuote: number;
  confirm: boolean;
}

export interface IResult {
  code: string;
  msg: string;
  data: string[][];
}

//+--------------------------------------------------------------------------------------+
//| Retrieves blofin rest api data and merges locally;                                   |
//+--------------------------------------------------------------------------------------+
export async function Merge(props: IKeyProps, apiCandles: Array<ICandleAPI>) {
  const candles = await Candle.Fetch(props, apiCandles.length);
  const modified: Array<ICandleAPI & IKeyProps> = [];
  const missing: Array<ICandleAPI & IKeyProps> = [];

  const db: Array<Partial<ICandle>> = candles.sort((a, b) => {
    return a.timestamp! < b.timestamp! ? +1 : a.timestamp! > b.timestamp! ? -1 : 0;
  });
  const api: Array<ICandleAPI> = apiCandles.sort((a, b) => {
    return a.ts < b.ts ? +1 : a.ts > b.ts ? -1 : 0;
  });

  let candle = 0;

  api.forEach((remote) => {
    if (remote.ts / 1000 === db[candle].timestamp) {
      let updated: boolean = false;

      !isEqual(remote.open, db[candle].open!) && (updated = true);
      !isEqual(remote.high, db[candle].high!) && (updated = true);
      !isEqual(remote.low, db[candle].low!) && (updated = true);
      !isEqual(remote.close, db[candle].close!) && (updated = true);
      !isEqual(remote.vol, db[candle].volume!) && (updated = true);
      !isEqual(remote.volCurrency, db[candle].vol_currency!) && (updated = true);
      !isEqual(remote.volCurrencyQuote, db[candle].vol_currency_quote!) && (updated = true);

      remote.confirm === db[candle].completed! && (updated = true);

      if (updated) {
        const update = Object.assign({}, props, remote);
        modified.push(update);
      }

      candle++;
    } else if (remote.ts / 1000 > db[candle].timestamp!) {
      const insert = Object.assign({}, props, remote);
      missing.push(insert);
    }
  });

  console.log("Candles Inserted: ", missing.length, missing);
  console.log("Candles Updated: ", modified.length, modified);

  await Candle.Update(modified);
  await Candle.Insert(missing);
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Import(props: IKeyProps, limit: number = 0) {
  fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${props.symbol}&limit=${limit}&bar=${props.timeframe}`)
    .then((response) => response.json())
    .then((result: IResult) => {
      const apiCandles: ICandleAPI[] = result.data.map((field: string[]) => ({
        ts: parseInt(field[0]),
        open: parseFloat(field[1]),
        high: parseFloat(field[2]),
        low: parseFloat(field[3]),
        close: parseFloat(field[4]),
        vol: parseInt(field[5]),
        volCurrency: parseInt(field[6]),
        volCurrencyQuote: parseInt(field[7]),
        confirm: parseInt(field[8]) === 1,
      }));

      Merge(props, apiCandles);
    });
}
