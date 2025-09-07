//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import { TSystem } from "@db/interfaces/state";

import { Select, Modify, parseColumns } from "@db/query.utils";
import { splitSymbol } from "@lib/app.util";

import * as Currency from "@db/interfaces/currency";
import * as State from "@db/interfaces/state";
import { hashKey } from "@lib/crypto.util";

export interface IInstrument {
  instrument?: Uint8Array;
  symbol?: string;
  base_currency?: Uint8Array;
  base_symbol?: string;
  quote_currency?: Uint8Array;
  quote_symbol?: string;
  instrument_type: string;
  contract_type: string;
  contract_value: number;
  max_leverage: number;
  min_size: number;
  lot_size: number;
  tick_size: number;
  digits: number;
  max_limit_size: number;
  max_market_size: number;
  leverage: number;
  margin_mode: string;
  martingale_factor: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  trade_period: Uint8Array;
  trade_timeframe: string;
  timeframe_units: number;
  trade_state: Uint8Array;
  trade_status: TSystem;
  suspense: boolean;
  list_time: Date;
  expiry_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Determines if instrument exists, if not, writes new to database; returns Key         |
//+--------------------------------------------------------------------------------------+
export async function Publish(base_currency: Uint8Array, quote_currency: Uint8Array): Promise<IInstrument["instrument"]> {
  const instrument = await Key({ base_currency, quote_currency });

  if (instrument === undefined) {
    const key = hashKey(6);
    const disabled = await State.Key({ status: "Disabled" });
    const margin_mode = 'cross';

    await Modify(`INSERT INTO blofin.instrument (instrument, base_currency, quote_currency, trade_state, margin_mode) VALUES (?, ?, ?, ?, ?)`, [
      key,
      base_currency,
      quote_currency,
      disabled,
      margin_mode
    ]);
    return key;
  }
  return instrument;
}

//+--------------------------------------------------------------------------------------+
//| Returns instrument by search method in props; executes search in priority sequence;  |
//+--------------------------------------------------------------------------------------+
export async function Key(props: Partial<IInstrument>): Promise<IInstrument["instrument"] | undefined> {
  const keys: Array<Uint8Array | string> = [];
  const filters: Array<string> = [];

  let sql = `SELECT instrument FROM blofin.vw_instruments`;

  if (props.instrument) {
    keys.push(props.instrument);
    filters.push(`instrument`);
  } else if (props.base_currency || props.quote_currency) {
    if (props.base_currency) {
      keys.push(props.base_currency);
      filters.push(`base_currency`);
    }
    if (props.quote_currency) {
      keys.push(props.quote_currency);
      filters.push(`quote_currency`);
    }
  } else if (props.base_symbol || props.quote_symbol) {
    if (props.base_symbol) {
      keys.push(props.base_symbol);
      filters.push(`base_symbol`);
    }
    if (props.quote_symbol) {
      keys.push(props.quote_symbol);
      filters.push(`quote_symbol`);
    }
  } else if (props.symbol) {
    const symbol: Array<string> = splitSymbol(props.symbol);
    keys.push(symbol[0], symbol[1]);
    filters.push(`base_symbol`, `quote_symbol`);
  } else return undefined;

  filters.forEach((filter, position) => {
    sql += (position ? ` AND ` : ` WHERE `) + filter + ` = ?`;
  });

  sql += ` LIMIT 1`;

  const [key] = await Select<IInstrument>(sql, keys);
  return key === undefined ? undefined : key.instrument;
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IInstrument>): Promise<Array<Partial<IInstrument>>> => {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_instruments ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IInstrument>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Suspends provided currency(s) upon receipt of an 'unalive' state from Blofin;        |
//+--------------------------------------------------------------------------------------+
export async function Suspend(suspensions: Array<Currency.IKeyProps>) {
  const suspend = await State.Key({ status: "Suspended" });

  for (const suspense of suspensions) {
    const args = [suspend];

    if (suspense.currency) {
      args.push(suspense.currency);
    } else if (suspense.symbol) {
      const currency = await Currency.Key({ symbol: suspense.symbol });
      args.push(currency);
    } else return;

    await Modify(`UPDATE blofin.instrument SET trade_state = ? WHERE base_currency = ?`, args);
  }
}
