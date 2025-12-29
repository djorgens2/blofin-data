//+--------------------------------------------------------------------------------------+
//|                                                               instrument_position.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TStatus, TSystem } from "db/interfaces/state";
import type { IPublishResult, TResponse } from "db/query.utils";

import { Select, Update, Insert, TOptions, PrimaryKey } from "db/query.utils";
import { hasValues, isEqual } from "lib/std.util";
import { hashKey, hexify } from "lib/crypto.util";
import { Session } from "module/session";

import * as State from "db/interfaces/state";
import * as Period from "db/interfaces/period";
import * as Instrument from "db/interfaces/instrument";

export type TPosition = `long` | `short` | `net`;

export interface IInstrumentPosition {
  account: Uint8Array;
  alias: string;
  environment: Uint8Array;
  environ: string;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  position: TPosition;
  hedging: boolean;
  state: Uint8Array;
  status: TStatus;
  auto_state: Uint8Array;
  auto_status: TSystem;
  period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
  digits: number;
  strict_stops: boolean;
  strict_targets: boolean;
  open_request: number;
  open_take_profit: number;
  open_stop_loss: number;
  margin_mode: "cross" | "isolated";
  leverage: number;
  max_leverage: number;
  lot_scale: number;
  martingale: number;
  sma: number;
  lot_size: number;
  min_size: number;
  max_limit_size: number;
  max_market_size: number;
  update_time: Date;
  close_time: Date;
  create_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrumentPosition>): Promise<IPublishResult<IInstrumentPosition>> => {
  if (hasValues(props)) {
    const instrument_position = await Fetch({
      account: Session().account,
      instrument_position: props.instrument_position,
      instrument: props.instrument,
      symbol: props.symbol,
      position: props.position,
    });

    if (instrument_position) {
      const [current] = instrument_position;
      const state = props.state || (await State.Key({ status: props.status }));
      const revised: Partial<IInstrumentPosition> = {
        instrument_position: current.instrument_position,
        state: isEqual(state!, current.state!) ? undefined : state,
        margin_mode: props.margin_mode! === current.margin_mode! ? undefined : props.margin_mode,
        leverage: isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
        lot_scale: isEqual(props.lot_scale!, current.lot_scale!) ? undefined : props.lot_scale,
        martingale: isEqual(props.martingale!, current.martingale!) ? undefined : props.martingale,
        period: isEqual(props.period!, current.period!) ? undefined : props.period,
        strict_stops: !!props.strict_stops === !!current.strict_stops! ? undefined : props.strict_stops,
        strict_targets: !!props.strict_targets === !!current.strict_targets! ? undefined : props.strict_targets,
        close_time: isEqual(props.close_time!, current.close_time!) ? undefined : props.close_time,
      };
      const result: TResponse = await Update(revised, { table: `instrument_position`, keys: [{ key: `instrument_position` }] });

      if (result.success) {
        const confirm: TResponse = await Update(
          { instrument_position: current.instrument_position, update_time: props.update_time || new Date() },
          { table: `instrument_position`, keys: [{ key: `instrument_position` }] }
        );
        return { key: PrimaryKey(revised, ["instrument_position"]), response: confirm };
      } else return { key: PrimaryKey(revised, ["instrument_position"]), response: result };
    } else {
      const instrument_position = hashKey(12);
      const account = Session().account;
      const instrument = props.instrument || (await Instrument.Key({ symbol: props.symbol }));
      const state = props.state || (await State.Key({ status: props.status || "Closed" }));
      const period = props.period || (await Period.Key({ timeframe: props.timeframe! }));
      const missing: Partial<IInstrumentPosition> = {
        instrument_position,
        account,
        instrument,
        position: props.position,
        state,
        leverage: props.leverage,
        lot_scale: props.lot_scale,
        martingale: props.martingale,
        period,
        strict_stops: props.strict_stops,
        strict_targets: props.strict_targets,
        update_time: props.update_time || new Date(),
        close_time: props.close_time || new Date(),
      };
      const result: TResponse = await Insert(missing, { table: `instrument_position`, keys: [{ key: `instrument_position` }] });
      return { key: PrimaryKey(missing, ["instrument_position"]), response: result };
    }
  } else {
    return { key: undefined, response: { success: false, code: 400, category: `null_query`, rows: 0 } };
  }
};

//+--------------------------------------------------------------------------------------+
//| Fetches instrument position data from local db meeting props criteria;               |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IInstrumentPosition>, options?: TOptions): Promise<Array<Partial<IInstrumentPosition>> | undefined> => {
  const result = await Select<IInstrumentPosition>(props, { ...options, table: `vw_instrument_positions` });
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
