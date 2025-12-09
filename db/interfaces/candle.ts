//+--------------------------------------------------------------------------------------+
//|                                                                            candle.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert, Update } from "db/query.utils";
import { isEqual } from "lib/std.util";

export interface ICandle {
  instrument: Uint8Array;
  symbol: string;
  period: Uint8Array;
  timeframe: string;
  timestamp: number;
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
//| Inserts new candles retrieved from the blofin rest api;                              |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<ICandle>) => {
  const { instrument, period, timestamp } = props;
  const candles = await Fetch({ instrument, period, timestamp });

  if (candles) {
    const [candle] = candles;
    await Update<ICandle>(
      {
        instrument,
        period,
        timestamp,
        open: props.open ? (isEqual(props.open, candle.open!) ? undefined : props.open) : undefined,
        high: props.high ? (isEqual(props.high, candle.high!) ? undefined : props.high) : undefined,
        low: props.low ? (isEqual(props.low, candle.low!) ? undefined : props.low) : undefined,
        close: props.close ? (isEqual(props.close, candle.close!) ? undefined : props.close) : undefined,
        volume: props.volume ? (isEqual(props.volume, candle.volume!) ? undefined : props.volume) : undefined,
        vol_currency: props.vol_currency ? (isEqual(props.vol_currency, candle.vol_currency!) ? undefined : props.vol_currency) : undefined,
        vol_currency_quote: props.vol_currency_quote
          ? isEqual(props.vol_currency_quote, candle.vol_currency_quote!)
            ? undefined
            : props.vol_currency_quote
          : undefined,
        completed: props.completed ? (!!props.completed === !!candle.completed! ? undefined : props.completed) : undefined,
      },
      { table: `candle`, keys: [{ key: `instrument` }, { key: `period` }, { key: `timestamp` }] }
    );
  } else {
    await Insert<ICandle>(
      {
        instrument,
        period,
        timestamp,
        open: props.open,
        high: props.high,
        low: props.low,
        close: props.close,
        volume: props.volume,
        vol_currency: props.vol_currency,
        vol_currency_quote: props.vol_currency_quote,
        completed: props.completed,
      },
      { table: `candle` }
    );
  }
};

//+--------------------------------------------------------------------------------------+
//| Returns all candles meeting the mandatory instrument/period requirements;            |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<ICandle>): Promise<Array<Partial<ICandle>> | undefined> => {
  const { limit, ...columns } = props;
  const suffix = `ORDER BY timestamp DESC${limit ? ` LIMIT ${limit || 1}` : ``}`;
  const keys = props.timestamp ? [{ key: `timestamp`, sign: `>=` }] : [];
  const result = await Select<ICandle>(columns, { table: `vw_candles`, keys, suffix });

  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns a specified limit-set of candles from the high (top) timestamp supplied;     |
//+--------------------------------------------------------------------------------------+
export const Batch = async (props: Partial<ICandle>): Promise<Array<Partial<ICandle>> | undefined> => {
  const { limit, ...columns } = props;
  const suffix = `ORDER BY timestamp DESC LIMIT ${limit || 1}`;
  const keys = props.timestamp ? [{ key: `timestamp`, sign: `<=` }] : [];
  const result = await Select<ICandle>(columns, { table: `vw_candles`, keys, suffix });
  
  return result.length ? result : undefined;
};
