//+--------------------------------------------------------------------------------------+
//|                                                               instrument_position.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TStatus, TSystem } from "db/interfaces/state";
import type { IInstrumentAPI } from "api/instruments";
import type { ILeverageAPI } from "api/leverage";

import { Select, Update, Insert, TOptions } from "db/query.utils";
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
  period: Uint8Array;
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
const merge = async (props: Array<TInstrumentLeverage>) => {
  if (hasValues(props)) {
    const state = await State.Key({ status: `Closed` });

    const promises = props.map(async (prop) => {
      const instrument_position = (await Fetch({ account: Session().account, symbol: prop.instId, position: prop.positionSide })) ?? [];

      if (instrument_position.length === 0) {
        const promise = Instrument.Key({ symbol: prop.instId }) ?? Promise.resolve(undefined);
        const instrument = await promise;
        const instrument_position: Partial<IInstrumentPosition> = {
          instrument_position: hashKey(12),
          account: Session().account,
          instrument,
          position: prop.positionSide,
          leverage: parseInt(prop.leverage),
          state,
          update_time: new Date(),
          close_time: new Date(),
        };
        return Insert(instrument_position, { table: `instrument_position`, keys: [{ key: `instrument_position` }] });
      }
      return Promise.resolve(undefined);
    });
    const results = await Promise.all(promises);
    const success = results.filter((result) => result !== null && result !== undefined);
    const fail = props.length - success.length;

    success.length && console.log(`   # [Info] Instrument.Position.Publish: ${success.length} positions added`);
    fail && console.log(`   # [Warning] Instrument.Position.Publish: Errors/Skips: ${fail} positions processed`);
  }
};

//------------------ Public functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Leverage = async (props: Partial<IInstrumentPosition>) => {
  if (!hasValues(props) || !props.symbol || !props.position || !props.leverage) {
    return undefined;
  }

  const promise = Fetch({
    account: Session().account,
    symbol: props.symbol,
    position: props.position,
    status: "Closed",
  });

  const instrument_position = await promise;

  if (instrument_position && instrument_position.length > 0) {
    const [current] = instrument_position;
    const leverage = isEqual(props.leverage, current.leverage!) ? undefined : props.leverage;

    if (leverage) {
      const result = (await LeverageAPI.Publish({
        instId: props.symbol,
        leverage: leverage.toString(),
        marginMode: props.margin_mode || current.margin_mode!,
        positionSide: props.position,
      })) as IInstrumentPosition;
      return result ? result.leverage : current.leverage;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Array<Partial<IInstrumentPosition>>): Promise<Array<Partial<IInstrumentPosition>> | undefined> => {
  if (!(props && props.length)) {
    return undefined;
  }
  const promises = props.map(async (prop) => {
    const promise = Select<IInstrumentPosition>(
      prop.instrument_position
        ? { instrument_position: prop.instrument_position }
        : { account: prop.account || Session().account, instrument: prop.instrument, symbol: prop.symbol, position: prop.position },
      { table: `instrument_position` }
    );
    const state = prop.state || (await State.Key({ status: prop.status }));
    const instrument_position = await promise;

    if (instrument_position.length) {
      const [current] = instrument_position;
      const revised: Partial<IInstrumentPosition> = {
        instrument_position: current.instrument_position,
        state: isEqual(state!, current.state!) ? undefined : state,
        margin_mode: isEqual(prop.margin_mode!, current.margin_mode!) ? undefined : prop.margin_mode,
        leverage: isEqual(prop.leverage!, current.leverage!) ? undefined : prop.leverage,
        lot_scale: isEqual(prop.lot_scale!, current.lot_scale!) ? undefined : prop.lot_scale,
        martingale: isEqual(prop.martingale!, current.martingale!) ? undefined : prop.martingale,
        period: isEqual(prop.period!, current.period!) ? undefined : prop.period,
        strict_stops: !!prop.strict_stops === !!current.strict_stops! ? undefined : prop.strict_stops,
        strict_targets: !!prop.strict_targets === !!current.strict_targets! ? undefined : prop.strict_targets,
        update_time: isEqual(prop.update_time!, current.update_time!) ? undefined : prop.update_time,
        close_time: isEqual(prop.close_time!, current.close_time!) ? undefined : prop.close_time,
      };
      const [result, updates] = await Update(revised, { table: `instrument_position`, keys: [{ key: `instrument_position` }] });

      return result ? result : undefined;
    }

    const results = await Promise.all(promises);
    const success = results.filter((result) => result !== null && result !== undefined);
    const fail = props.length - success.length;

    success.length && console.log(`   # [Info] Instrument.Position.Publish: ${success.length} new positions successfully processed`);
    fail && console.log(`   # [Warning] Instrument.Position.Publish: Errors/Skips: ${fail} positions processed`);
  });
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
      const api = ((await LeverageAPI.Fetch([{ symbol: symbols, margin_mode: account.margin_mode! }])) as Array<ILeverageAPI>) ?? [];
      const positions = mergeLeverage(batch, api);
      return positions;
    });

    const results = await Promise.all(promises);
    await merge(results.flat() as Array<TInstrumentLeverage>);
  }

  const missing = await Fetch({ account: Session().account }, { suffix: `AND instrument_position IS NULL` });
  if (missing && missing.length) {
    console.log("-> Instrument.Position.Import: Creating missing instrument positions");
    const promises = missing.map(async (prop) => {
      const position: Partial<IInstrumentPosition> = {
        instrument_position: hashKey(12),
        account: prop.account,
        instrument: prop.instrument,
        position: prop.position,
        leverage: prop.leverage,
        state: prop.state,
        period: prop.period,
        lot_scale: prop.lot_scale,
        martingale: prop.martingale,
        strict_stops: prop.strict_stops,
        strict_targets: prop.strict_targets,
        update_time: new Date(),
      };
      const result = await Insert(position, { table: `instrument_position`, keys: [{ key: `account` }, { key: `instrument` }, { key: `position` }] });

      return result;
    });

    const results = await Promise.all(promises);
    const success = results.filter((result) => result !== null && result !== undefined);
    const fail = missing.length - success.length;

    success.length && console.log(`   # [Info] Instrument.Position.Publish: ${success.length} positions added`);
    fail && console.log(`   # [Warning] Instrument.Position.Publish: Errors/Skips: ${fail} positions processed`);
  }
};
