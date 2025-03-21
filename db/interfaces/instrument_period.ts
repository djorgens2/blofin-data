//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Modify } from "@db/query.utils";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { hex, copy } from "@/lib/std.util";

import * as Instrument from "@db/interfaces/instrument";
import * as Period from "@db/interfaces/period";
import * as State from "@db/interfaces/trade_state";

export interface IInstrumentPeriod extends RowDataPacket {
  instrument: Uint8Array;
  currency_pair: string;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  digits: number;
  trade_state: Uint8Array;
  state: string;
  suspense: boolean;
}

export interface IKeyProps {
  instrument?: Uint8Array;
  currency?: Uint8Array;
  currencyPair?: string;
  symbol?: string;
  period?: Uint8Array;
  timeframe?: string;
  tradeState?: Uint8Array;
  state?: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument periods;                                                 |
//+--------------------------------------------------------------------------------------+
export async function Publish(): Promise<ResultSetHeader> {
  const result = await Modify(
    `INSERT INTO instrument_period (instrument, period)
       SELECT missing.instrument, missing.period
         FROM instrument_period ip
              RIGHT JOIN (
                SELECT i.instrument, p.period
                  FROM instrument i, period p ) missing
                    ON ip.instrument = missing.instrument
                   AND ip.period = missing.period
        WHERE ip.period IS NULL`,
    []
  );

  return result;
}

//+--------------------------------------------------------------------------------------+
//| Examine instrument period search methods in props; return keys in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key<T extends IKeyProps>(props: T, limit: number = 1): Promise<Array<Uint8Array> | undefined> {
  const key: IKeyProps = {};
  const filter = [];
  const args = [];

  key.instrument = await Instrument.Key<IKeyProps>(props);
  key.period = await Period.Key<IKeyProps>(props);
  key.tradeState = await State.Key<IKeyProps>(props);

  key.instrument && (filter.push(`instrument = ?`));
  key.period && (filter.push(`period = ?`));
  key.tradeState && (filter.push(`trade_state = ?`));

  const results = await Select<IInstrumentPeriod>(`select instrument from instrument_period where bulk_collection_rate > 0`, []);
  const keys: Array<Uint8Array> = []; 
  
  results.forEach((result) => keys.push(result.instrument!));

  return keys === undefined ? undefined : keys.slice(0,limit);
}

//+--------------------------------------------------------------------------------------+
//| Fetch one instrument period for the provided instrument;                             |
//+--------------------------------------------------------------------------------------+
export function Fetch<T extends IKeyProps>(props: T) {
  return Select<IInstrumentPeriod>(`SELECT * FROM vw_instrument_periods where instrument = ? AND period = ?`, [props.instrument, props.period]);
}

//+--------------------------------------------------------------------------------------+
//| Returns details on actively trading/data collecting instruments                      |
//+--------------------------------------------------------------------------------------+
export function FetchActive() {
  return Select<IInstrumentPeriod>(
    `SELECT instrument, currency_pair, period, timeframe, bulk_collection_rate, digits 
       FROM vw_instrument_periods WHERE bulk_collection_rate > 0 AND suspense = false`,
    []
  );
}
