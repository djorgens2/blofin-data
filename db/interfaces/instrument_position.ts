/**
 * Management logic for instrument-specific trading positions, including
 * synchronization between API/WebSocket updates and the local database.
 * @packageDocumentation
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TPositionState, TSymbol, TSystem } from "#db/interfaces/state";
import type { IPublishResult } from "#api";
import type { TOptions } from "#db";

import { Select, Update, Insert, PrimaryKey, Distinct } from "#db";
import { State, Period, Instrument, Currency } from "#db";
import { hasValues, isEqual } from "#lib/std.util";
import { hashKey } from "#lib/crypto.util";
import { Session } from "#module/session";

/**
 * Core interface representing an Instrument Position record.
 * Maps directly to the `vw_instrument_positions` database view.
 */
export interface IInstrumentPosition {
  /** Unique account identifier hash. */
  account: Uint8Array;
  /** Human-readable account name. */
  alias: string;
  /** Environment identifier (e.g., Live vs Demo). */
  environment: Uint8Array;
  /** Environment name string. */
  environ: string;
  /** Primary Key: Unique identifier for this specific instrument position. */
  instrument_position: Uint8Array;
  /** Foreign Key: Reference to the Instrument table. */
  instrument: Uint8Array;
  /** Trading symbol (e.g., "BTC/USDT"). */
  symbol: string;
  /** Foreign Key: Base currency identifier. */
  base_currency: Uint8Array;
  base_symbol: string;
  /** Foreign Key: Quote currency identifier. */
  quote_currency: Uint8Array;
  quote_symbol: string;
  /** Direction of the position. */
  position: `long` | `short` | `net`;
  /** Indicates if hedging is enabled for this symbol. */
  hedging: boolean;
  /** Current state hash. */
  state: Uint8Array;
  /** Human-readable position status. */
  status: TPositionState;
  /** Automation state identifier. */
  auto_state: Uint8Array;
  /** Automation system status. */
  auto_status: TSystem;
  /** Underlying instrument state hash. */
  instrument_state: Uint8Array;
  /** Underlying instrument operational status. */
  instrument_status: TSymbol;
  /** Timeframe period identifier. */
  period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
  /** Precision digits for the instrument price. */
  digits: number;
  /** Enforcement of stop-loss orders. */
  strict_stops: boolean;
  /** Enforcement of take-profit orders. */
  strict_targets: boolean;
  open_request: number;
  open_take_profit: number;
  open_stop_loss: number;
  /** Margin handling mode. */
  margin_mode: "cross" | "isolated";
  /** Currently applied leverage. */
  leverage: number;
  /** Maximum allowable leverage for the account/symbol. */
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

/**
 * Synchronizes external API/WSS position data with the local database.
 * Performs a "diff" check to only update fields that have changed.
 * If the record doesn't exist, it initializes a new position with hashed keys.
 *
 * @param props - The updated position data received from the broker/exchange.
 * @param context - Log tracing context. Defaults to "Instrument.Position".
 * @returns A promise resolving to the database operation result and primary key.
 */
  export const Publish = async (props: Partial<IInstrumentPosition>, context = "Instrument.Position"): Promise<IPublishResult<IInstrumentPosition>> => {
    context = `${context}.Publish`;
    if (!hasValues(props)) {
      return { key: undefined, response: { success: false, code: 413, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context } };
    }

    const exists = await Fetch({
      account: Session().account,
      instrument_position: props.instrument_position,
      instrument: props.instrument,
      symbol: props.symbol,
      position: props.position,
    });

    if (exists) {
      const [current] = exists;
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
      const result = await Update(revised, { table: `instrument_position`, keys: [[`instrument_position`]], context: "Instrument.Position.Publish" });

      if (result.success) {
        const confirm = await Update(
          { instrument_position: current.instrument_position, update_time: props.update_time || new Date() },
          { table: `instrument_position`, keys: [[`instrument_position`]], context: "Instrument.Position.Publish" },
        );
        return { key: PrimaryKey(revised, ["instrument_position"]), response: confirm };
      }
      return { key: PrimaryKey(revised, ["instrument_position"]), response: result };
    }

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
    const result = await Insert(missing, { table: `instrument_position`, keys: [[`instrument_position`]], context: "Instrument.Position.Publish" });
    return { key: PrimaryKey(missing, ["instrument_position"]), response: result };
  };

/**
 * Retrieves instrument position records from the `vw_instrument_positions` view.
 *
 * @param props - Filtering criteria for the query.
 * @param options - Standard database query options (pagination, sorting).
 * @returns An array of matching partial position records or undefined.
 */
export const Fetch = async (
  props: Partial<IInstrumentPosition>,
  options?: TOptions<IInstrumentPosition>,
): Promise<Array<Partial<IInstrumentPosition>> | undefined> => {
  const result = await Select<IInstrumentPosition>(props, { ...options, table: `vw_instrument_positions` });
  return result.success ? result.data : undefined;
};

/**
 * Locates the `instrument_position` primary key for a specific set of criteria.
 *
 * @param props - Seek parameters (e.g., symbol and account).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IInstrumentPosition>): Promise<IInstrumentPosition["instrument_position"] | undefined> => {
  if (hasValues<Partial<IInstrumentPosition>>(props)) {
    const result = await Select<IInstrumentPosition>(props, { table: `vw_instrument_positions` });
    return result.success && result.data?.length ? result.data[0].instrument_position : undefined;
  }
  return undefined;
};

/**
 * Audits local instrument records against active API data to identify discrepancies.
 * 
 * This function performs a "suspense" check:
 * 1. Fetches all instruments from the local database that are NOT currently 'Suspended'.
 * 2. Filters the incoming `props` to identify which instruments the API considers 'Enabled'.
 * 3. Compares the two lists; any instrument present in the DB but missing/disabled in the API 
 *    is flagged for suspension.
 * 4. Triggers a `Currency.Publish` update to set the status of these instruments to 'Suspended'.
 * 
 * @param props - An array of instrument position objects representing the current state from the API.
 * @param context - Log tracing context for debugging. Defaults to `Instrument.Suspense`.
 * 
 * @returns A promise resolving to an array of publication results for each instrument 
 *          successfully moved to the 'Suspended' state.
 * 
 * @example
 * // Reconcile local DB with a fresh list of enabled instruments from the broker
 * const auditResults = await Suspense(apiResponse.positions);
 */
export const Suspense = async (props: Array<Partial<IInstrumentPosition>>, context = `Instrument.Suspense`): Promise<Array<IPublishResult<IInstrumentPosition>>> => {
  context = `${context}.Suspense`;
  if (!hasValues(props)) {
    return [{ key: undefined, response: { success: false, code: 400, state: `null_query`, message: `[Error] ${context}`, rows: 0, context } }];
  }
  const current = await Distinct<IInstrumentPosition>(
    { account: Session().account, symbol: undefined, instrument_status: `Suspended` },
    { table: `vw_instrument_positions`, keys: [[`account`], [`instrument_status`, "<>"]] },
    context,
  );
  const api = props.filter((p) => p.instrument_status === `Enabled`);
  const suspense = current.data!
    .filter((db) => !api.some((suspend) => suspend.symbol === db.symbol))
    .map((instrument) =>
      Currency.Publish({
        currency: instrument.base_currency,
        status: `Suspended`,
      }),
    );

  const results = await Promise.all(suspense);
  console.log(`-> Instrument.Suspense: Found ${suspense.length} instruments to suspend`);
  return results as Array<IPublishResult<IInstrumentPosition>>;
};