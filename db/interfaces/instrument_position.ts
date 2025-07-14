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
}

//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument periods;                                                 |
//+--------------------------------------------------------------------------------------+
export async function Publish() {
  const state = await State.Key({ status: "Closed" });
  const keys = await Select<IInstrumentPosition>(`SELECT i.instrument, p.position FROM blofin.instrument i, blofin.position p`, []);
  const sql = `INSERT IGNORE INTO blofin.instrument_position (instrument_position, instrument, position, state ) VALUES (?, ?, ?, ?)`;

  for (const key of keys) {
    const instrument_position = hashKey(6);
    const args = [instrument_position, key.instrument, key.position, state];
    try {
      await Modify(sql, args);
    } catch (e) {
      console.log(sql, args);
    }
  }
}

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Update = async (actives: Array<Partial<IInstrumentPosition>>) => {
  if (actives.length) {
    for (const active of actives) {
      const { symbol, position, status } = active;
      const instrument = active.instrument ? active.instrument : symbol ? await Instrument.Key({ symbol }) : undefined;
      const state = active.state ? active.state : status ? await State.Key({ status }) : undefined;

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
