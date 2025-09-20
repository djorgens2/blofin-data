//+--------------------------------------------------------------------------------------+
//|                                                                            candle.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert, Update } from "@db/query.utils";
import { isEqual } from "@lib/std.util";

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
  const { instrument, period, bar_time } = props;
  const candles = await Fetch({ instrument, period, bar_time });

  if (candles) {
    const [candle] = candles;
    Update<ICandle>(
      {
        instrument,
        period,
        bar_time,
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
        completed: props.completed ? (!!props.completed !== !!candle.completed! ? undefined : props.completed) : undefined,
      },
      { table: `candle`, keys: [{ key: `instrument` }, { key: `period` }, { key: `bar_time` }] }
    );
  } else {
    Insert<ICandle>(
      {
        instrument,
        period,
        bar_time,
        open: props.open,
        high: props.close,
        low: props.low,
        close: props.close,
        volume: props.vol_currency,
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
  const { limit, timestamp, ...columns } = props;
  const suffix = `ORDER BY bar_time DESC${limit ? ` LIMIT ${limit || 1}` : ``}`;
  const keys = [];

  if (timestamp) {
    keys.push({ key: `bar_time`, sign: `>=` });
    Object.assign(columns, { bar_time: new Date(timestamp) });
  }

  const result = await Select<ICandle>(columns, { table: `vw_candles`, keys, suffix, log: `OnError` });
  return result.length ? result : undefined;
};
