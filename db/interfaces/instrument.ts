//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import { Status } from "@db/interfaces/state";

import { Select, Modify } from "@db/query.utils";
import { splitSymbol } from "@lib/app.util";

import * as Currency from "@db/interfaces/currency";
import * as State from "@db/interfaces/state";
import { hashKey } from "@lib/crypto.util";

export interface IKeyProps {
  instrument?: Uint8Array;
  symbol?: string;
  base_symbol?: string;
  quote_symbol?: string;
  base_currency?: Uint8Array;
  quote_currency?: Uint8Array;
  limit?: number;
  fromSymbol?: string;
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
  trade_status: Status;
  suspense: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Determines if instrument exists, if not, writes new to database; returns Key         |
//+--------------------------------------------------------------------------------------+
export async function Publish(base_currency: Uint8Array, quote_currency: Uint8Array): Promise<IKeyProps["instrument"]> {
  const instrument = await Key({ base_currency, quote_currency });

  if (instrument === undefined) {
    const key = hashKey(6);
    const disabled = await State.Key({ status: "Disabled" });

    await Modify(`INSERT INTO blofin.instrument (instrument, base_currency, quote_currency, trade_state) VALUES (?, ?, ?, ?)`, [
      key,
      base_currency,
      quote_currency,
      disabled
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
//| Retrieves all trading-related instrument details by Key;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<Partial<IInstrument>>> {
  const instrument = await Key(props);
  const args = [];
  const sql: string =
    `SELECT * FROM blofin.vw_instruments` +
    (instrument ? ` WHERE instrument = ?` : ``) +
    (props.fromSymbol ? (instrument ? ` AND ` : ` WHERE `) : ``) +
    (props.fromSymbol ? `symbol >= ? ORDER BY symbol LIMIT ${props.limit || 1}` : ``);

  instrument && args.push(instrument);
  props.fromSymbol && args.push(props.fromSymbol);

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
