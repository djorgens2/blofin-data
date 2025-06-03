//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { System } from "@db/interfaces/state";

import { Select, Modify } from "@db/query.utils";

import * as Instrument from "@db/interfaces/instrument";
import * as Period from "@db/interfaces/period";
import * as State from "@db/interfaces/state";

export interface IKeyProps {
  instrument?: Uint8Array;
  symbol?: string;
  base_symbol?: string;
  base_currency?: Uint8Array;
  period?: Uint8Array;
  timeframe?: string;
  active_collection?: boolean;
  trade_state?: Uint8Array;
  trade_status?: System;
}

export interface IInstrumentPeriod extends IKeyProps, RowDataPacket {
  quote_symbol: string;
  quote_currency: Uint8Array;
  timeframe_units: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  digits: number;
  suspense: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument periods;                                                 |
//+--------------------------------------------------------------------------------------+
export async function Publish(): Promise<ResultSetHeader> {
  const result = await Modify(
    `INSERT INTO blofin.instrument_period (instrument, period)
       SELECT missing.instrument, missing.period
         FROM instrument_period ip
              RIGHT JOIN (
                SELECT i.instrument, p.period
                  FROM blofin.instrument i, blofin.period p ) missing
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
export async function Fetch(props: IKeyProps): Promise<Array<Partial<IInstrumentPeriod>>> {
  const params: IKeyProps = {};
  const keys: Array<Uint8Array | string | number | boolean> = [];
  const filters: Array<string> = [];

  let sql = `select * from blofin.vw_instrument_periods`;

  (props.symbol || props.base_currency || props.base_symbol || props.instrument) && (params.instrument = await Instrument.Key(props));
  (props.timeframe || props.period) && (params.period = await Period.Key(props));
  (props.trade_state || props.trade_status) && (params.trade_state = await State.Key({ state: props.trade_state, status: props.trade_status }));

  if (params.instrument) {
    filters.push(`instrument`);
    keys.push(params.instrument);
  }

  if (params.period) {
    filters.push(`period`);
    keys.push(params.period);
  }
  if (params.trade_state) {
    filters.push(`trade_state`);
    keys.push(params.trade_state);
  }

  if (props.active_collection) {
    filters.push(`active_collection`);
    keys.push(props.active_collection);
  }

  filters.forEach((filter, position) => {
    sql += (position ? ` AND ` : ` WHERE `) + filter + ` = ?`;
  });

  return Select<IInstrumentPeriod>(sql, keys);
}
