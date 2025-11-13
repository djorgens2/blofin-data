//+--------------------------------------------------------------------------------------+
//|                                                               instrument_position.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TStatus, TSystem } from "db/interfaces/state";

import { Select, Update, Load } from "db/query.utils";
import { hasValues, isEqual } from "lib/std.util";
import { hashKey } from "lib/crypto.util";
import { Session } from "module/session";

import * as State from "db/interfaces/state";

export interface IInstrumentPosition {
  account: Uint8Array;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  position: `long` | `net` | `short`;
  symbol: string;
  state: Uint8Array;
  status: TStatus;
  trade_period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
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
export const Import = async () => {
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
};

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrumentPosition>) => {
  const instrument_position = await Select<IInstrumentPosition>(
    props.instrument_position
      ? { instrument_position: props.instrument_position }
      : { account: props.account || Session().account, instrument: props.instrument, symbol: props.symbol, position: props.position },
    { table: `instrument_position` }
  );

  if (instrument_position.length) {
    const [current] = instrument_position;
    const state = props.state || (await State.Key({ status: props.status }));
    const auto_state = props.auto_state || (await State.Key({ status: props.auto_status }));
    const revised: Partial<IInstrumentPosition> = {
      instrument_position: current.instrument_position,
      state: isEqual(state!, current.state!) ? undefined : state,
      auto_state: isEqual(auto_state!, current.auto_state!) ? undefined : auto_state,
      strict_stops: !!props.strict_stops === !!current.strict_stops! ? undefined : props.strict_stops,
      strict_targets: !!props.strict_targets === !!current.strict_targets! ? undefined : props.strict_targets,
      update_time: isEqual(props.update_time!, current.update_time!) ? undefined : props.update_time,
      close_time: isEqual(props.close_time!, current.close_time!) ? undefined : props.close_time,
    };
    const [result, updates] = await Update(revised, { table: `instrument_position`, keys: [{ key: `instrument_position` }] });

    return result ? result : undefined;
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
  if (hasValues<Partial<IInstrumentPosition>>(props)) {
    const [result] = await Select<IInstrumentPosition>(props, { table: `vw_instrument_positions` });
    return result ? result.instrument_position : undefined;
  } else return undefined;
};
