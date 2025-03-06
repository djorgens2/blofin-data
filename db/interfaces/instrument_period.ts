//+------------------------------------------------------------------+
//|                                             instrument_period.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Select, Modify } from "@db/query.utils";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface IInstrumentPeriod extends RowDataPacket {
  instrument: number;
  currency_pair: string;
  base_currency: number;
  base_symbol: string;
  quote_currency: number;
  quote_symbol: string;
  period: number;
  timeframe: string;
  data_collection_rate: number;
  sma_factor: number;
  digits: number;
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

export function Fetch() {
  return Select<IInstrumentPeriod>(`SELECT * FROM vw_instrument_periods`, []);
}

export function FetchActive() {
  return Select<IInstrumentPeriod>(
    `SELECT instrument, currency_pair, period, timeframe, units, data_collection_rate, digits
       FROM vw_instrument_periods WHERE data_collection_rate > 0 AND suspense = false`,
    []
  );
}

export function FetchInactive() {
  return Select<IInstrumentPeriod>(
    `SELECT * FROM vw_instrument_periods
      WHERE data_collection_rate = 0 AND suspense = false`,
    []
  );
}

export function FetchSuspense() {
  return Select<IInstrumentPeriod>(`SELECT * FROM vw_instrument_periods WHERE suspense = true`, []);
}
