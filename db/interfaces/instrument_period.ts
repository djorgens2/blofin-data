//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Modify } from "@db/query.utils";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { State } from "@db/interfaces/trade_state";

import * as Instrument from "@db/interfaces/instrument";
import * as Period from "@db/interfaces/period";
import * as TradeState from "@db/interfaces/trade_state";

export interface IInstrumentPeriod extends IKeyProps, RowDataPacket {
  instrument: Uint8Array;
  symbol: string;
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
  activeCollection: boolean;
  suspense: boolean;
}

export interface IKeyProps {
  instrument?: Uint8Array;
  currency?: Uint8Array;
  symbol?: string;
  period?: Uint8Array;
  timeframe?: string;
  tradeState?: Uint8Array;
  activeCollection?: boolean;
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
export async function Fetch<T extends IKeyProps>(props: T, limit: number = 1): Promise<Partial<IInstrumentPeriod>[] | undefined> {
  const params: IKeyProps = {};
  const keys: Array<Uint8Array | string | number | boolean> = [];
  const filters: Array<string> = [];
  const keyset: Array<Uint8Array> = [];

  let sql = `select * from vw_instrument_periods`;

  params.instrument = await Instrument.Key<IKeyProps>(props);
  params.period = await Period.Key<IKeyProps>(props);
  params.tradeState = await TradeState.Key<IKeyProps>(props);

  if (params.instrument) {
    filters.push(`instrument`);
    keys.push(params.instrument);
  }

  if (params.period) {
    filters.push(`period`);
    keys.push(params.period);
  }
  if (params.tradeState) {
    filters.push(`trade_state`);
    keys.push(params.tradeState);
  }

  if (props.activeCollection) {
    filters.push(`active_collection`);
    keys.push(props.activeCollection);
  }

  filters.forEach((filter, position) => {
    sql += (position ? ` AND ` : ` WHERE `) + filter + ` = ?`;
  });

  
  return Select<IInstrumentPeriod>(sql, keys);
  //const instruments = await Select<IInstrumentPeriod>(sql, keys);
  
  // instruments.forEach((key) => keyset.push(key.instrument!));
  // console.log(sql, keys, filters, params);
  // return keyset === undefined ? undefined : keyset.slice(0, limit);
}

//+--------------------------------------------------------------------------------------+
//| Returns details on actively trading/data collecting instruments                      |
//+--------------------------------------------------------------------------------------+
export function FetchActive() {
  return Select<IInstrumentPeriod>(
    `SELECT instrument, symbol, period, timeframe, bulk_collection_rate, digits 
       FROM vw_instrument_periods WHERE bulk_collection_rate > 0 AND suspense = false`,
    []
  );
}
