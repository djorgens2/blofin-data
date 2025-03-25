//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Modify } from "@db/query.utils";
import { ResultSetHeader, RowDataPacket } from "mysql2";

import * as Instrument from "@db/interfaces/instrument";
import * as Period from "@db/interfaces/period";
import * as TradeState from "@db/interfaces/trade_state";

export interface IInstrumentPeriod extends IKeyProps, RowDataPacket {
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  timeframe_units: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  digits: number;
  suspense: boolean;
}

export interface IKeyProps {
  instrument?: Uint8Array | undefined;
  symbol?: string;
  period?: Uint8Array | undefined;
  timeframe?: string;
  tradeState?: Uint8Array | undefined;
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
export async function Fetch(props: IKeyProps): Promise<Array<Partial<IInstrumentPeriod>>> {
  const params: IKeyProps = {};
  const keys: Array<Uint8Array | string | number | boolean> = [];
  const filters: Array<string> = [];
  
  let sql = `select * from vw_instrument_periods`;

  (props.symbol || props.instrument) && (params.instrument = await Instrument.Key(props));
  (props.timeframe || props.period) && (params.period = await Period.Key(props));
  (props.state || props.tradeState) && (params.tradeState = await TradeState.Key(props));

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
