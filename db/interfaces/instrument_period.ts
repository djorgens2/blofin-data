//+------------------------------------------------------------------+
//|                                             instrument_period.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Select, Modify } from "@db/query.utils";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { State } from "@db/interfaces/trade_state";

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

export async function Publish(): Promise<ResultSetHeader> {
  const set = await Modify(
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

  return set;
}

export function Fetch(instrument: number, period: number) {
  return Select<IInstrumentPeriod>(`SELECT * FROM vw_instrument_periods where instrument = ? AND period = ?`, [instrument, period]);
}

export function FetchSymbol(currency_pair: string, timeframe: string) {
  return Select<IInstrumentPeriod>(`SELECT * FROM vw_instrument_periods where currency_pair = ? AND period = ?`, [currency_pair, timeframe]);
}

export function FetchState(state: State) {
  return Select<IInstrumentPeriod>(`SELECT * FROM vw_instrument_periods WHERE state = ?`, [state]);
}

export function FetchActive() {
  return Select<IInstrumentPeriod>(
    `SELECT instrument, currency_pair, period, timeframe, bulk_collection_rate, digits 
       FROM vw_instrument_periods WHERE bulk_collection_rate > 0 AND suspense = false`,
    []
  );
}

export function FetchInactive() {
  return Select<IInstrumentPeriod>(
    `SELECT * FROM vw_instrument_periods WHERE bulk_collection_rate = 0 AND suspense = false`,
    []
  );
}

export function FetchSuspense() {
  return Select<IInstrumentPeriod>(`SELECT * FROM vw_instrument_periods WHERE suspense = true`, []);
}
