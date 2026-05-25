/**
 * @module Instrument-API-Interface
 * @description Orchestrates the ETL lifecycle for Market Instruments using a Unified API Client.
 *
 * Tracks:
 * 1. Extract: Retrieves Session-authorized instrument metadata via API_GET.
 * 2. Transform: Maps raw Blofin JSON schema to local relational interfaces.
 * 3. Load: Persists Instrument Master, Detail, and Suspense states.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult, TResponse } from "#api";
import type { IInstrument, IInstrumentPosition } from "#db";

import { Instrument, InstrumentDetail, InstrumentPosition } from "#db";
import { API_GET, InstrumentPositions } from "#api";
import { withSession } from "#app/session";
import { Log } from "#lib/log.util";

/** Internal endpoint for Blofin market data */
const INSTRUMENT_PATH = "/api/v1/market/instruments";

/**
 * Raw Instrument Schema from the Blofin REST API.
 */
export interface IInstrumentAPI {
  instId: string;
  baseCurrency: string;
  quoteCurrency: string;
  contractValue: string;
  listTime: string;
  expireTime: string;
  maxLeverage: string;
  minSize: string;
  lotSize: string;
  tickSize: string;
  instType: string;
  contractType: string;
  maxLimitSize: string;
  maxMarketSize: string;
  state: string;
}

/**
 * Internal Publication Sequence (Load Phase).
 *
 * Orchestrates a multi-track persistence flow:
 * - Master: Initializes the symbol entry.
 * - Detail: Populates contract specs (leverage, lot sizes, tick accuracy).
 * - Suspense: Synchronizes 'live' API state to 'Enabled' DB status.
 * - Period: Bootstraps standardized timeframe intervals.
 *
 * @private
 * @async
 * @param props - Array of validated instrument payloads from the exchange.
 * @returns {Promise<any[]>} Flat array of publication results for the ETL trace.
 */
const publish = async (account: Uint8Array, baseContext: string, props: Array<IInstrumentAPI>) => {
  const context = baseContext + ".Publish (internal)";

  Log().info(`-> ${context}`);

  const instruments = props.map(async (api) => {
    // 1. Master Record
    const [master] = await Instrument.Publish({ account, symbol: api.instId }, context);

    if (master.response.success && master.key?.instrument) {
      // 2. Detail Specs
      const [detail] = await InstrumentDetail.Publish(
        {
          instrument: master.key.instrument,
          instrument_type: api.instType,
          contract_type: api.contractType,
          contract_value: parseFloat(api.contractValue) || 0,
          max_leverage: parseInt(api.maxLeverage) || 1,
          min_size: parseFloat(api.minSize) || 0,
          lot_size: parseFloat(api.lotSize) || 0,
          tick_size: parseFloat(api.tickSize) || 0,
          max_limit_size: parseFloat(api.maxLimitSize) || 0,
          max_market_size: parseFloat(api.maxMarketSize) || 0,
          list_time: new Date(parseInt(api.listTime)),
          expiry_time: new Date(parseInt(api.expireTime)),
        },
        context,
      );

      return detail;
    }
    return master;
  });

  // 3. Publish instruments and reconcile positions
  const results = await Promise.all(instruments);
  const positions = await InstrumentPositions.Import();
  
  // 4. Sync Operational State (Suspense)
  const suspended = await InstrumentPosition.Suspense(
    props.map((api) => ({
      account,
      symbol: api.instId,
      instrument_status: api.state === "live" ? "Enabled" : "Suspended",
    })),
    context,
  );

  return [...results, ...positions, ...suspended].flat();
};

/**
 * FETCH (Passive API Call)
 * Retrieves the subset of instruments authorized for the current API Key and Environment.
 *
 * @async
 * @returns {Promise<TResponse & { data?: IInstrumentAPI[] | undefined }>} Enveloped array of session-active instruments.
 */
export const Fetch = async (): Promise<TResponse & { data?: IInstrumentAPI[] }> => {
  return await API_GET<IInstrumentAPI[]>(INSTRUMENT_PATH, "Instruments.Fetch");
};

/**
 * IMPORT (Hydration)
 * 
 * @description
 * Synchronizes the local Master Catalog with the current environment's available instruments.
 * Standardized via withSession to ensure Sandbox Isolation.
 *
 * @note This uses the authenticated session client to ensure Sandbox Isolation
 * (Dev accounts only see Dev instruments).
 *
 * @async
 * @returns {Promise<TResponse>} Status envelope of the hydration process.
 */
export const Import = async (): Promise<Array<IPublishResult<IInstrument | IInstrumentPosition>>> => {
  const context = "Instruments.Import";

  return withSession(context, async (session) => {
    // 1. EXTRACT
    const { success, data } = await Fetch();

    if (!success || !data?.length) {
      return [
        {
          key: undefined,
          response: { success: false, code: 404, state: "not_found", message: `[Error] ${context}: No API data`, rows: 0, context },
        },
      ];
    }

    // 2. TRANSFORM & LOAD
    try {
      const results = await publish(session.account, context, data);
      return results as Array<IPublishResult<IInstrument | IInstrumentPosition>>;
    } catch (err) {
      const message = err instanceof Error ? err.message : "DATABASE_WRITE_FAILURE";
      return [
        {
          key: undefined,
          response: { success: false, code: 500, state: "error", message: `[Error] ${context}: ${message}`, rows: 0, context },
        },
      ];
    }
  });
};
