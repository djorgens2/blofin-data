//+--------------------------------------------------------------------------------------+
//|                                                                    [api]  candles.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ICandle } from "@db/interfaces/candle";
import type { IMessage } from "@lib/app.util";

import { isEqual } from "@lib/std.util";
import { clear } from "@lib/app.util";

import * as Candle from "@db/interfaces/candle";
import * as Period from "@db/interfaces/period";
import * as Instrument from "@db/interfaces/instrument";

export interface ICandleAPI {
  ts: string;
  open: string;
  high: string;
  low: string;
  close: string;
  vol: string;
  volCurrency: string;
  volCurrencyQuote: string;
  confirm: string;
}

export interface IResult {
  code: string;
  msg: string;
  data: string[][];
}

//+--------------------------------------------------------------------------------------+
//| Applies inserts/updates from rest api data to local db;                              |
//+--------------------------------------------------------------------------------------+
const publish = async (message: IMessage, props: Partial<ICandle>, api: Array<ICandleAPI>) => {
  console.log(`-> Candle:Publish [API]: ${props.symbol} / ${api.length}`);

  const modified = [];
  const missing = [];

  if (api.length) {
    const { instrument, period } = props;

    for (const candle of api) {
      await Candle.Publish({
        instrument,
        period,
        bar_time: new Date(parseInt(candle.ts)),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseInt(candle.vol),
        vol_currency: parseFloat(candle.volCurrency),
        vol_currency_quote: parseFloat(candle.volCurrencyQuote),
        completed: !!parseInt(candle.confirm),
      });
    }
  }

  // missing.length && console.log(`   # Candles:Imported [${props.symbol}, ${props.timeframe}]: `, missing.length, "inserted");
  // modified.length && console.log(`   # Candles Merged: [${props.symbol}, ${props.timeframe}]:`, modified.length, "updated");

  process.send && process.send({ ...message, db: { insert: missing.length, update: modified.length } });
};

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export const Import = async (message: IMessage, props: Partial<ICandle>) => {
  try {
    const local = await Instrument.Fetch({ instrument: props.instrument, symbol: props.symbol });

    if (local === undefined) throw new Error(`Unathorized fetch request; instrument/symbol not found`);
    else {
      const [{ instrument, interval_collection_rate, symbol, trade_period, trade_timeframe }] = local;
      const periods = await Period.Fetch({ period: props.period || trade_period, timeframe: props.timeframe || trade_timeframe || "15m" });

      if (periods) {
        const [{ period, timeframe, timeframe_units }] = periods;
        const candle = await Candle.Fetch({ instrument, period, completed: true, limit: 1 });
        const start = candle ? `&before=${candle[0].bar_time!.getTime() - (interval_collection_rate || 1) * (timeframe_units || 1) * 60 * 1000}` : ``;
        const response = await fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${symbol}&limit=1440&bar=${timeframe}${start}`);

        if (response.ok) {
          const json = await response.json();
          const result: IResult = json;
          const api = result.data.map((field: string[]) => ({
            ts: field[0],
            open: field[1],
            high: field[2],
            low: field[3],
            close: field[4],
            vol: field[5],
            volCurrency: field[6],
            volCurrencyQuote: field[7],
            confirm: field[8],
          }));

          await publish(message, { instrument, period, symbol }, api);
        }
      }
    }
  } catch (error) {
    console.log("Bad request in Candles.Import", { props, response: error });
  }
};

//+--------------------------------------------------------------------------------------+
//| Retrieve and merge full-history, candle data; format; pass to publisher;             |
//+--------------------------------------------------------------------------------------+
export const Loader = async (props: { symbol: string; timeframe: string; start_time: number }) => {
  const { symbol, timeframe } = props;
  const instrument = await Instrument.Key({ symbol });
  const period = await Period.Key({ timeframe });

  if (!instrument) return `Instrument not found: ${symbol}`;
  if (!period) return `Period not found: ${timeframe}`;

  Object.assign(props, { instrument, period, timestamp: props.start_time });

  console.log(`Loader start for ${props.symbol} after ${props.start_time} on ${new Date().toISOString()}`);

  do {
    const after = props.start_time ? `&after=${props.start_time}` : "";
    console.log(`Fetching candles for ${props.symbol} after [${props.start_time},${new Date(props.start_time).toISOString()}]`);

    try {
      const response = await fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${symbol}&limit=100&bar=${timeframe}${after}`);

      if (response.ok) {
        const json = await response.json();
        const result: IResult = json;
        if (result.data.length) {
          const api = result.data.map((field: string[]) => ({
            ts: field[0],
            open: field[1],
            high: field[2],
            low: field[3],
            close: field[4],
            vol: field[5],
            volCurrency: field[6],
            volCurrencyQuote: field[7],
            confirm: field[8],
          }));

          props.start_time = parseInt(api[api.length - 1].ts);
          publish(clear({ state: "init", symbol: symbol, node: 1 }), { ...props, timestamp: props.start_time }, api);
        } else {
          await new Promise((r) => setTimeout(r, 30000)); //--- wait 30 seconds for data to apply ---
          console.log(`Loader end for ${props.symbol} after ${props.start_time} on ${new Date().toISOString()}`);
          return `Process finished, last timestamp: ${props.start_time}`;
        }
      }
    } catch (error) {
      console.log(`Loader error for ${props.symbol} after ${props.start_time} on ${new Date().toISOString()}`);
      return (error as Error).message;
    }

    await new Promise((r) => setTimeout(r, 5000));
  } while (true);
};
