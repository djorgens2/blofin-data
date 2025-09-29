//+--------------------------------------------------------------------------------------+
//|                                                               instrument_position.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TStatus, TSystem } from "@db/interfaces/state";

import { Select, Update, Load } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

import * as Instrument from "@db/interfaces/instrument";
import * as State from "@db/interfaces/state";
import { isEqual } from "@lib/std.util";

export interface IInstrumentPosition {
  instrument_position: Uint8Array;
  account: Uint8Array;
  instrument: Uint8Array;
  position: `long` | `net` | `short`;
  symbol: string;
  state: Uint8Array;
  status: TStatus;
  auto_state: Uint8Array;
  auto_status: TSystem;
  strict_stops: boolean;
  strict_targets: boolean;
  digits: number;
  open_request: number;
  open_take_profit: number;
  open_stop_loss: number;
  create_time: Date;
  update_time: Date;
  close_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument positions;                                               |
//+--------------------------------------------------------------------------------------+
export async function Import() {
  const state = await State.Key({ status: "Closed" });
  const instrument_position = await Select<IInstrumentPosition>({}, { table: `vw_audit_instrument_positions` });

  if (instrument_position.length) {
    console.log("In Instrument.Position.Import:", new Date().toLocaleString());

    const imports: Array<Partial<IInstrumentPosition>> = [];

    for (const ipos of instrument_position) {
      const time = new Date();
      const key = hashKey(12);

      imports.push({
        ...ipos,
        instrument_position: key,
        state: state,
        strict_stops: false,
        strict_targets: false,
        update_time: time,
        close_time: time,
      });
    }
    await Load<IInstrumentPosition>(imports, { table: `instrument_position` });
    console.log("   # Instrument Position imports: ", instrument_position.length, "verified");
  }
}

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrumentPosition>) => {
  const instrument_position = await Select<IInstrumentPosition>({ instrument_position: props.instrument_position }, { table: `instrument_position` });

  if (instrument_position.length) {
    const [current] = instrument_position;
    const revised: Partial<IInstrumentPosition> = {
      instrument_position: current.instrument_position,
      state: props.state && isEqual(props.state, current.state!) ? undefined : props.state,
      auto_state: props.auto_state && isEqual(props.auto_state, current.auto_state!) ? undefined : props.auto_state,
      strict_stops: props.strict_stops && !!props.strict_stops === !!current.strict_stops! ? undefined : props.strict_stops,
      strict_targets: props.strict_targets && !!props.strict_targets === !!current.strict_targets! ? undefined : props.strict_targets,
      update_time: props.update_time && isEqual(props.update_time, current.update_time!) ? undefined : props.update_time,
      close_time: props.close_time && isEqual(props.close_time, current.close_time!) ? undefined : props.close_time,
    };
    const [result, updates] = await Update(revised, { table: `instrument_position`, keys: [{ key: `instrument_position` }] });

    return result ? [result.instrument_position, updates] : [undefined, undefined]; 
  }
};

//+--------------------------------------------------------------------------------------+
//| Fetches instrument position data from local db meeting props criteria;               |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IInstrumentPosition>): Promise<Array<Partial<IInstrumentPosition>> | undefined> => {
  const result = await Select<IInstrumentPosition>(props, { table: `vw_instrument_positions` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches authorized (open for trading) instrument configuration data from local db;   |
//+--------------------------------------------------------------------------------------+
export const Authorized = async (props: Partial<IInstrumentPosition>): Promise<Array<Partial<IInstrumentPosition>> | undefined> => {
  const result = await Select<IInstrumentPosition>(props, { table: `vw_auth_trade_instruments` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches instrument position key from local db meeting props criteria;                |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IInstrumentPosition>): Promise<IInstrumentPosition["instrument_position"] | undefined> => {
  if (Object.keys(props).length) {
    const [result] = await Select<IInstrumentPosition>(props, { table: `vw_instrument_positions` });
    return result ? result.instrument_position : undefined;
  } else return undefined;
};
