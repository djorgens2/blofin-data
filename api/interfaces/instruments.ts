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
import type { IInstrument } from "#db";

import { Instrument, InstrumentDetail, InstrumentPeriod, InstrumentPosition } from "#db";
import { API_GET, ApiResult } from "#api";

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

/** Internal endpoint for Blofin market data */
const INSTRUMENT_PATH = "/api/v1/market/instruments";

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
const publish = async (props: Array<IInstrumentAPI>) => {
  console.log("-> Instrument.Publish [API]");

  const results = props.map(async (api) => {
    const master = await Instrument.Publish({ symbol: api.instId });

    if (master.response.success) {
      const detail = await InstrumentDetail.Publish({
        instrument: master.key?.instrument,
        instrument_type: api.instType,
        contract_type: api.contractType,
        contract_value: parseFloat(api.contractValue),
        max_leverage: parseInt(api.maxLeverage),
        min_size: parseFloat(api.minSize),
        lot_size: parseFloat(api.lotSize),
        tick_size: parseFloat(api.tickSize),
        max_limit_size: parseFloat(api.maxLimitSize),
        max_market_size: parseFloat(api.maxMarketSize),
        list_time: new Date(parseInt(api.listTime)),
        expiry_time: new Date(parseInt(api.expireTime)),
      });
      return detail as IPublishResult<IInstrument>;
    }
    return master as IPublishResult<IInstrument>;
  });

  const published = await Promise.all(results);

  // Synchronize operational state (Live -> Enabled)
  const suspended = await InstrumentPosition.Suspense(
    props.map((i) => ({
      symbol: i.instId,
      instrument_status: i.state === "live" ? "Enabled" : "Suspended",
    })),
  );

  await InstrumentPeriod.Import();

  return [...published, ...suspended].flat();
};

/**
 * FETCH (Session View)
 * Retrieves the subset of instruments authorized for the current API Key and Environment.
 *
 * @async
 * @returns {PPromise<TResponse & { data?: IInstrumentAPI[] | undefined }>} Enveloped array of session-active instruments.
 */
export const Fetch = async (): Promise<TResponse & { data?: IInstrumentAPI[] | undefined }> => {
  return await API_GET<IInstrumentAPI[]>(INSTRUMENT_PATH, "Instruments.Fetch");
};

/**
 * IMPORT (Hydration)
 * Synchronizes the local Master Catalog with the current environment's available instruments.
 *
 * @note This uses the authenticated session client to ensure Sandbox Isolation
 * (Dev accounts only see Dev instruments).
 *
 * @async
 * @returns {Promise<TResponse>} Status envelope of the hydration process.
 */
export const Import = async (): Promise<TResponse> => {
  const context = "Instruments.Import";

  // High-performance approach: Use the same signed client as Fetch
  const response = await API_GET<IInstrumentAPI[]>(INSTRUMENT_PATH, context);

  const { success, data } = response;

  if (success && Array.isArray(data)) {
    try {
      const results = await publish(data);
      return ApiResult(true, context, { data: results });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DATABASE_WRITE_FAILURE";
      return ApiResult(false, context, { message: `Local DB Publication failed: ${msg}` });
    }
  }

  return response;
};
