//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { RowDataPacket } from "mysql2";
import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex, splitSymbol } from "@/lib/std.util";
import { State } from "@db/interfaces/trade_state";

import * as Currency from "@db/interfaces/currency";
import * as TradeState from "@db/interfaces/trade_state";

export interface IInstrument extends RowDataPacket {
  instrument: Uint8Array;
  currency_pair: string;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
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

export interface IKeyProps {
  instrument?: Uint8Array;
  currencyPair?: string;
  symbol?: Array<string>;
  currency?: Array<Uint8Array>;
}

//+--------------------------------------------------------------------------------------+
//| Determines if instrument exists, if not, writes new to database; returns Key         |
//+--------------------------------------------------------------------------------------+
export async function Publish(baseCurrency: Uint8Array, quoteCurrency: Uint8Array): Promise<Uint8Array> {
  const instrument = await Key({ currency: [baseCurrency, quoteCurrency] });

  if (instrument === undefined) {
    const key = hex(UniqueKey(6), 3);
    const tradeState = await TradeState.Key({ state: State.Disabled });

    await Modify(`INSERT INTO instrument (instrument, base_currency, quote_currency, trade_state) VALUES (?, ?, ?, ?)`, [
      key,
      baseCurrency,
      quoteCurrency,
      tradeState,
    ]);
    return key;
  }
  return instrument;
}

//+--------------------------------------------------------------------------------------+
//| Examines instrument search methods in props; executes first in priority sequence;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<Uint8Array | undefined> {
  const args = [];

  if (props.instrument) {
    args.push(hex(props.instrument, 3), `SELECT instrument FROM instrument WHERE instrument = ?`);
  } else if (props.currency?.length === 2) {
    args.push(hex(props.currency[0]), hex(props.currency[1]), `SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?`);
  } else {
    const symbol: Array<string> =
      props.symbol?.length === 2 ? [props.symbol[0], props.symbol[1]] : props.currencyPair === undefined ? ["", ""] : splitSymbol(props.currencyPair);
    args.push(symbol[0], symbol[1], `SELECT instrument FROM vw_instruments WHERE base_symbol = ? AND quote_symbol = ?`);
  }

  const [key] = await Select<IInstrument>(args[args.length - 1].toString(), args.slice(0, args.length - 1));
  return key === undefined ? undefined : key.instrument;
}

//+--------------------------------------------------------------------------------------+
//| Retrieves all trading-related instrument details by Key;                              |
//+--------------------------------------------------------------------------------------+
export function Fetch(instrument: Uint8Array) {
  return Select<IInstrument>(`SELECT * FROM vw_instruments WHERE instrument = ?`, [instrument]);
}

//+--------------------------------------------------------------------------------------+
//| Retrieves all instruments including details;                                         |
//+--------------------------------------------------------------------------------------+
export function FetchAll() {
  return Select<IInstrument>(`SELECT * FROM vw_instruments`, []);
}

//+--------------------------------------------------------------------------------------+
//| Retrieves all instruments identified for bulk loading candle data;                   |
//+--------------------------------------------------------------------------------------+
export function FetchActive() {
  return Select<IInstrument>(
    `SELECT instrument, currency_pair, trade_period, trade_timeframe, sma_factor, data_collection_rate, digits
       FROM vw_instruments WHERE data_collection_rate > 0 AND suspense = false`,
    []
  );
}

//+--------------------------------------------------------------------------------------+
//| Suspends provided currency upon receipt of an 'unalive' state from Blofin;           |
//+--------------------------------------------------------------------------------------+
export async function Suspend(suspensions: Array<Currency.IKeyProps>) {
  const state = await TradeState.Key({ state: "Suspended" });

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
