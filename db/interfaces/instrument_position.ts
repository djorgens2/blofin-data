//+--------------------------------------------------------------------------------------+
//|                                                               instrument_position.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TStatus, TSystem } from "db/interfaces/state";
import type { IInstrumentAPI } from "api/instruments";
import type { ILeverageAPI } from "api/leverage";

import { Select, Update, Insert } from "db/query.utils";
import { hasValues, isEqual } from "lib/std.util";
import { hashKey } from "lib/crypto.util";
import { Session } from "module/session";

import * as State from "db/interfaces/state";
import * as Account from "db/interfaces/account";
import * as Instrument from "db/interfaces/instrument";

import * as LeverageAPI from "api/leverage";
import * as InstrumentAPI from "api/instruments";

export type TInstrumentLeverage = ILeverageAPI & Partial<IInstrumentAPI>;
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
  trade_period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
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
  lot_size: number;
  min_size: number;
  max_limit_size: number;
  max_market_size: number;
  digits: number;
  update_time: Date;
  close_time: Date;
  create_time: Date;
}  

//------------------ Private functions ---------------------//

//+----------------------------------------------------------------------------------------+
//| function to create batches of instruments (e.g., 20; max limit set by broker)          |
//+----------------------------------------------------------------------------------------+
const createBatches = (props: Array<Partial<IInstrumentAPI>>, batchSize = 20) => {
  const batches = [];
  for (let i = 0; i < props.length; i += batchSize) {
    batches.push(props.slice(i, i + batchSize));
  }
  return batches;
};

//+----------------------------------------------------------------------------------------+
//| Merges leverage data with account-specific instrument data;                            |
//+----------------------------------------------------------------------------------------+
const mergeLeverage = (instruments: Partial<IInstrumentAPI>[], leverages: ILeverageAPI[]): TInstrumentLeverage[] => {
  const instrumentMap = new Map<string, Partial<IInstrumentAPI>>();
  for (const item of instruments) {
    item.instId && instrumentMap.set(item.instId, item);
  }

  const mergedData: TInstrumentLeverage[] = leverages.map((leverageItem) => {
    const matchingInstrument = instrumentMap.get(leverageItem.instId);
    if (!matchingInstrument) {
      console.warn(`No matching instrument found for instId: ${leverageItem.instId}`);
    }

    return {
      ...(matchingInstrument || {}),
      ...leverageItem,
    };
  });

  return mergedData;
};

//+--------------------------------------------------------------------------------------+
//| Creates new (*missing) instrument positions for the logged account;                  |
//+--------------------------------------------------------------------------------------+
const publish = async (props: Array<TInstrumentLeverage>) => {
  if (hasValues(props)) {
    const state = await State.Key({ status: `Closed` });

    const promises = props.map(async (position) => {
      const instrument_position = await Select<IInstrumentPosition>(
        { account: Session().account, symbol: position.instId, position: position.positionSide },
        { table: `vw_instrument_positions` }
      );

      if (instrument_position.length === 0) {
        const promise = Instrument.Key({ symbol: position.instId }) ?? Promise.resolve(undefined);
        const instrument = await promise;
        const instrument_position: Partial<IInstrumentPosition> = {
          instrument_position: hashKey(12),
          account: Session().account,
          instrument,
          position: position.positionSide,
          leverage: parseInt(position.leverage),
          state,
          update_time: new Date(),
          close_time: new Date(),
        };
        return Insert(instrument_position, { table: `instrument_position`, keys: [{ key: `instrument_position` }] });
      }
      return Promise.resolve(undefined);
    });
    const results = await Promise.all(promises);
    const success = results.filter(result => result !== null && result !== undefined);
    const fail = props.length - success.length;

    console.log(`Published ${success.length} new positions successfully. Failures/Skips: ${fail}`);
  }
};

//------------------ Public functions ---------------------//

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
    const revised: Partial<IInstrumentPosition> = {
      instrument_position: current.instrument_position,
      state: isEqual(state!, current.state!) ? undefined : state,
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
//| Fetches instrument position key from local db meeting props criteria;                |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IInstrumentPosition>): Promise<IInstrumentPosition["instrument_position"] | undefined> => {
  if (hasValues<Partial<IInstrumentPosition>>(props)) {
    const [result] = await Select<IInstrumentPosition>(props, { table: `vw_instrument_positions` });
    return result ? result.instrument_position : undefined;
  } else return undefined;
};

// +----------------------------------------------------------------------------------------+
// | Main import function with batching and concurrency                                     |
// +----------------------------------------------------------------------------------------+
export const Import = async () => {
  const instruments = await InstrumentAPI.Fetch();

  if (instruments && instruments.length) {
    console.log("-> Instrument.Position.Import [API]");

    const [account] = (await Account.Fetch({ account: Session().account })) ?? [];
    const batches = createBatches(instruments, 20);
    const promises = batches.map(async (batch) => {
      const symbols: string = batch.map((i: Partial<IInstrumentAPI>) => i.instId).join(",");
      const api = (await LeverageAPI.Fetch([{ symbol: symbols, margin_mode: account.margin_mode! }])) ?? [];
      const positions = mergeLeverage(batch, api);
      return positions;
    });

    const results = await Promise.all(promises);
    await publish(results.flat() as Array<TInstrumentLeverage>);
  }
};
