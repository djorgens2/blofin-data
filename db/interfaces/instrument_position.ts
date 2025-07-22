//+--------------------------------------------------------------------------------------+
//|                                                               instrument_position.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TPosition } from "@db/interfaces/state";

import { Select, Modify } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

import * as Instrument from "@db/interfaces/instrument";
import * as State from "@db/interfaces/state";

export interface IInstrumentPosition {
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  base_symbol: string;
  base_currency: Uint8Array;
  position: string;
  state: Uint8Array;
  status: TPosition;
  auto_trade: Uint8Array;
  auto_trade_status: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument positions;                                               |
//+--------------------------------------------------------------------------------------+
export async function Import() {
  const state = await State.Key({ status: "Closed" });
  const keys = await Select<IInstrumentPosition>(`SELECT i.instrument, p.position, i.trade_state as auto_trade FROM blofin.instrument i, blofin.position p`, []);
  const sql = `INSERT IGNORE INTO blofin.instrument_position (instrument_position, instrument, position, state, auto_trade ) VALUES (?, ?, ?, ?, ?)`;

  for (const key of keys) {
    const instrument_position = hashKey(6);
    const args = [instrument_position, key.instrument, key.position, state, key.auto_trade];
    try {
      await Modify(sql, args);
    } catch (e) {
      console.log(e, sql, args);
    }
  }
}

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Update = async (updates: Array<Partial<IInstrumentPosition>>) => {
  if (updates.length) {
    for (const update of updates) {
      const { symbol, position, status } = update;
      const instrument = update.instrument ? update.instrument : symbol ? await Instrument.Key({ symbol }) : undefined;
      const state = update.state ? update.state : status ? await State.Key({ status }) : undefined;
      const field = state && status === "Closed" ? "close" : "update";
      const sql = `UPDATE blofin.instrument_position SET state = ?, ${field}_time = now() where instrument = ? and position = ?`;
      const args = [state, instrument, position];
      try {
        await Modify(sql, args);
      } catch (e) {
        console.log({ e, sql, args });
      }
    }
  }
};
