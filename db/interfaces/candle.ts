//+--------------------------------------------------------------------------------------+
//|                                                                            candle.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert, Update, TOptions } from "db/query.utils";
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
    const revised = {
      instrument,
      period,
      timestamp,
      open: isEqual(props.open!, candle.open!) ? undefined : props.open,
      high: isEqual(props.high!, candle.high!) ? undefined : props.high,
      low: isEqual(props.low!, candle.low!) ? undefined : props.low,
      close: isEqual(props.close!, candle.close!) ? undefined : props.close,
      volume: isEqual(props.volume!, candle.volume!) ? undefined : props.volume,
      vol_currency: isEqual(props.vol_currency!, candle.vol_currency!, 5) ? undefined : props.vol_currency,
      vol_currency_quote: isEqual(props.vol_currency_quote!, candle.vol_currency_quote!, 5) ? undefined : props.vol_currency_quote,
      completed: !!props.completed === !!candle.completed! ? undefined : props.completed,
    };
    return await Update<ICandle>(revised, { table: `candle`, keys: [{ key: `instrument` }, { key: `period` }, { key: `timestamp` }] });
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

//export const Fetch = async (props: Partial<ICandle>): Promise<Array<Partial<ICandle>> | undefined> => {
//   const { limit, ...columns } = props;
//   const suffix = `ORDER BY timestamp DESC${limit ? ` LIMIT ${limit || 1}` : ``}`;
//   const keys = props.timestamp ? [{ key: `timestamp`, sign: `>=` }] : [];
//   const result = await Select<ICandle>(columns, { table: `vw_candles`, keys, suffix });

//   return result.length ? result : undefined;
// };


//+--------------------------------------------------------------------------------------+
//| Returns all candles meeting the mandatory instrument/period requirements;            |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<ICandle>, options?: TOptions): Promise<Array<Partial<ICandle>> | undefined> => {
  const result = await Select<ICandle>(props, { table: options?.table || `vw_candles`, suffix: options?.suffix });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns a specified limit-set of candles from the high (top) timestamp supplied;     |
//+--------------------------------------------------------------------------------------+
export const History = async (props: Partial<ICandle>): Promise<Array<Partial<ICandle>> | undefined> => {
  const { limit, ...columns } = props;
  const suffix = `ORDER BY timestamp DESC LIMIT ${limit || 1}`;
  const keys = props.timestamp ? [{ key: `timestamp`, eval: `<=` }] : [];
  const result = await Select<ICandle>(columns, { table: `vw_candles`, keys, suffix });

  return result.length ? result : undefined;
};
