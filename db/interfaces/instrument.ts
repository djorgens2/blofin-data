//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex, splitSymbol } from "@/lib/std.util";
import { State } from "@db/interfaces/trade_state";

import * as Currency from "@db/interfaces/currency";
import * as TradeState from "@db/interfaces/trade_state";

export interface IKeyProps {
  instrument?: Uint8Array;
  symbol?: string;
  base_symbol?: string;
  quote_symbol?: string;
  base_currency?: Uint8Array;
  quote_currency?: Uint8Array;
}

export interface IInstrument extends IKeyProps, RowDataPacket {
  instrument_type: string;
  contract_type: string;
  trade_period: Uint8Array;
  trade_timeframe: string;
  timeframe_units: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  contract_value: number;
  max_leverage: number;
  min_size: number;
  lot_size: number;
  tick_size: number;
  digits: number;
  max_limit_size: number;
  max_market_size: number;
  list_time: Date;
  list_timestamp: number;
  expiry_time: Date;
  expiry_timestamp: number;
  trade_state: Uint8Array;
  state: string;
  suspense: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Determines if instrument exists, if not, writes new to database; returns Key         |
//+--------------------------------------------------------------------------------------+
export async function Publish(base_currency: Uint8Array, quote_currency: Uint8Array): Promise<IKeyProps["instrument"]> {
  const instrument = await Key({ base_currency, quote_currency });

  if (instrument === undefined) {
    const key = hex(UniqueKey(6), 3);
    const trade_state = await TradeState.Key({ state: State.Disabled });

    await Modify(`INSERT INTO instrument (instrument, base_currency, quote_currency, trade_state) VALUES (?, ?, ?, ?)`, [
      key,
      base_currency,
      quote_currency,
      trade_state,
    ]);
    return key;
  }
  return instrument;
}

//+--------------------------------------------------------------------------------------+
//| Returns instrument by search method in props; executes search in priority sequence;  |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["instrument"] | undefined> {
  const keys: Array<Uint8Array | string> = [];
  const filters: Array<string> = [];

  let sql = `SELECT instrument FROM vw_instruments`;

  if (props.instrument) {
    keys.push(hex(props.instrument, 3));
    filters.push(`instrument`);
  } else if (props.base_currency || props.quote_currency) {
    if (props.base_currency) {
      keys.push(hex(props.base_currency, 3));
      filters.push(`base_currency`);
    }
    if (props.quote_currency) {
      keys.push(hex(props.quote_currency, 3));
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
//| Retrieves all trading-related instrument details by Key;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps, filter?: { limit?: number; fromSymbol?: string }): Promise<Array<Partial<IInstrument>>> {
  const instrument = await Key(props);
  const args = [];
  const sql: string =
    `select * FROM vw_instruments` +
    (instrument ? ` WHERE instrument = ?` : ``) +
    (filter?.fromSymbol ? (instrument ? ` AND ` : ` WHERE `) : ``) +
    (filter?.fromSymbol ? `symbol >= ? ORDER BY symbol LIMIT ${filter.limit || 1}` : ``);

  instrument && args.push(instrument);
  filter?.fromSymbol && args.push(filter.fromSymbol);

  return Select<IInstrument>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Suspends provided currency upon receipt of an 'unalive' state from Blofin;           |
//+--------------------------------------------------------------------------------------+
export async function Suspend(suspensions: Array<Currency.IKeyProps>) {
  const state = await TradeState.Key({ state: State.Suspended });

  for (const suspense of suspensions) {
    const args = [state];

    if (suspense.currency) {
      args.push(hex(suspense.currency));
    } else if (suspense.symbol) {
      const currency = await Currency.Key({ symbol: suspense.symbol });
      args.push(currency);
    } else return;

    await Modify(`UPDATE instrument SET trade_state = ? WHERE base_currency = ?`, args);
  }
}
