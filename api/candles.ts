//+--------------------------------------------------------------------------------------+
//|                                                                    [api]  candles.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ICandle } from "db/interfaces/candle";

import { hasValues } from "lib/std.util";
import { Session } from "module/session";
import { Select, Load } from "db/query.utils";
import { AppConfig } from "db/app.config";

import * as Candle from "db/interfaces/candle";
import * as Period from "db/interfaces/period";
import * as Instrument from "db/interfaces/instrument";
import { clear, IMessage } from "lib/app.util";

export interface ICandleAPI {
  symbol?: string;
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

interface IInstrumentCandle {
  account: Uint8Array;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
  timestamp: number;
  candle_max_fetch: number;
}

interface ILoaderProps {
  symbol: string;
  timeframe: string;
  startTime: number;
}


// +--------------------------------------------------------------------------------------+
// | Test for changed candle;                                                             |
// +--------------------------------------------------------------------------------------+
const isChanged = (apiCandle: Partial<ICandle>, dbCandle: Partial<ICandle>): boolean => {
  return (
    apiCandle.open !== dbCandle.open ||
    apiCandle.high !== dbCandle.high ||
    apiCandle.low !== dbCandle.low ||
    apiCandle.close !== dbCandle.close ||
    apiCandle.volume !== dbCandle.volume ||
    apiCandle.vol_currency !== dbCandle.vol_currency ||
    apiCandle.vol_currency_quote !== dbCandle.vol_currency_quote ||
    !!apiCandle.completed !== !!dbCandle.completed
  );
};

// +--------------------------------------------------------------------------------------+
// | Aggregate and format data for bulk loading;                                          |
// +--------------------------------------------------------------------------------------+
const publish = async (props: Partial<ICandle>, api: Array<ICandleAPI>) => {
  api.length > 5 && console.log(`-> Candle:Publish [API]: ${api[0].symbol} / ${api.length}`);

  if (hasValues(api)) {
    const { instrument, period } = props;
    const candles: Array<Partial<ICandle>> = api.map((c: ICandleAPI) => {
      return {
        instrument,
        period,
        timestamp: parseInt(c.ts),
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseInt(c.vol),
        vol_currency: parseFloat(c.volCurrency),
        vol_currency_quote: parseFloat(c.volCurrencyQuote),
        completed: !!parseInt(c.confirm),
      };
    });

    const dbBatch = (await Candle.Batch({ ...props, timestamp: candles[0].timestamp, limit: AppConfig().candle_max_fetch })) ?? [];
    const dbCandleMap = new Map<number, Partial<ICandle>>();
    dbBatch.forEach((c) => dbCandleMap.set(c.timestamp!, c));

    const categorized = candles.reduce(
      (acc, apiCandle) => {
        const existingDbCandle = dbCandleMap.get(apiCandle.timestamp!);

        if (existingDbCandle) {
          if (isChanged(apiCandle, existingDbCandle)) {
            acc.updates.push(apiCandle);
          }
        } else {
          acc.inserts.push(apiCandle);
        }
        return acc;
      },
      { inserts: [] as Array<Partial<ICandle>>, updates: [] as Array<Partial<ICandle>> }
    );

    return {
      size: candles.length,
      inserts: categorized.inserts,
      updates: categorized.updates,
    };
  } else return { size: 0, inserts: [], updates: [] };
};

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export const Publish = async (message: IMessage) => {
  const instrument = await Select<IInstrumentCandle>({ account: Session().account, symbol: message.symbol }, { table: "vw_instrument_candles" });

  if (instrument.length) {
    const [current] = instrument;

    try {
      const { instrument, symbol, period, timeframe, timeframe_units, timestamp, candle_max_fetch } = current;
      const keys = { instrument, period };
      const start = `&before=${timestamp! - 3 * timeframe_units! * 60 * 1000}`;
      const response = await fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${symbol}&limit=${candle_max_fetch}&bar=${timeframe}${start}`);

      if (response.ok) {
        const json = await response.json();
        const result: IResult = json;
        if (result.data.length > 0) {
          const api: ICandleAPI[] = result.data.map((c: string[]) => ({
            symbol,
            ts: c[0],
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            vol: c[5],
            volCurrency: c[6],
            volCurrencyQuote: c[7],
            confirm: c[8],
          }));

          const published = await publish(keys, api);
          published.inserts.length && (await Load<ICandle>(published.inserts, { table: `candle` }));
          const promises = published.updates.map((update) => Candle.Publish(update));
          await Promise.all(promises);

          const receipt = { ...message, db: { insert: published.inserts.length, update: published.updates.length } };
          process.send && process.send(receipt);
          return receipt;
        }
      } else throw new Error(`Bad response from candle fetch: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log("Bad request in Candles.Import", { response: error });
    }
  } else throw new Error(`Unathorized fetch request; no instruments found for account`);
};

//+--------------------------------------------------------------------------------------+
//| Retrieve and merge full-history, candle data; format; pass to publisher;             |
//+--------------------------------------------------------------------------------------+
export const Import = async (message: IMessage, props: ILoaderProps) => {
  const { symbol, timeframe } = props;
  const [instrument, period] = await Promise.all([Instrument.Key({ symbol }), Period.Key({ timeframe })]);

  if (instrument && period) {
    console.log(`Loader start for ${symbol} after ${props.startTime} on ${new Date().toISOString()}`);

    const limit = AppConfig().candle_max_fetch || 100;
    const keys = { instrument, period };
    
    const inserts: Array<Partial<ICandle>> = [];
    const updates: Array<Partial<ICandle>> = [];

    while (true) {
      console.log(`Fetching candles for ${symbol} after [${props.startTime},${new Date(props.startTime).toISOString()}]`);

      const after = props.startTime ? `&after=${props.startTime}` : "";

      try {
        const response = await fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${symbol}&limit=${limit}&bar=${timeframe}${after}`);

        if (response.ok) {
          const json = await response.json();
          const result: IResult = json;

          if (result.data.length > 0) {
            const api: ICandleAPI[] = result.data.map((c: string[]) => ({
              symbol,
              ts: c[0],
              open: c[1],
              high: c[2],
              low: c[3],
              close: c[4],
              vol: c[5],
              volCurrency: c[6],
              volCurrencyQuote: c[7],
              confirm: c[8],
            }));

            props.startTime = parseInt(api[api.length - 1].ts);
            const published = await publish(keys, api);
            inserts.push(...published.inserts);
            updates.push(...published.updates);
          } else {
            inserts.length && (await Load<ICandle>(inserts, { table: `candle` }));
            const promises = updates.map((update) => Candle.Publish(update));
            await Promise.all(promises);

            const receipt = { ...message, db: { insert: inserts.length, update: updates.length } };
            process.send && process.send(receipt);
            return receipt;
          }
        } else {
          throw new Error(`Bad response from candle fetch: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`Loader error for ${symbol} after ${props.startTime} on ${new Date().toISOString()}`);
        return { ...message, text: Error().message } as IMessage;
      }

      await new Promise((r) => setTimeout(r, 1500));
    }
  }
};
