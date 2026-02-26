/**
 * @file instrument_period.ts
 * @summary Instrument Period Management & Synchronization
 * @description Handles the auditing and retrieval of instrument-to-timeframe mappings.
 * Utilizes the 'All or Nothing' Fetch pattern for simplified downstream logic.
 * 
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import { Select, Load } from "#db"; // Explicit .ts for Native Node 22

/** @interface Represents a unique mapping of an instrument to a specific timeframe */
export interface IInstrumentPeriod {
  instrument: Uint8Array;
  symbol: string;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
}

/**
 * Audits and synchronizes missing instrument periods.
 * 
 * @description
 * 1. Fetches suggested periods from `vw_audit_instrument_periods`.
 * 2. If data exists, performs a bulk `Load` into the master table.
 * 
 * @returns {Promise<TResponse | undefined>} The result of the Load operation or undefined.
 */
export const Import = async () => {
  const { success, data } = await Select<IInstrumentPeriod>({}, { table: `vw_audit_instrument_periods` });
  
  // Logical Gate: All-or-nothing Load
  if (success && data && data.length > 0) {
    return await Load(data, { table: `instrument_period` });
  }
  
  return undefined;
};

/**
 * Retrieves instrument periods based on search criteria.
 * 
 * @param props - Filter criteria (e.g., { symbol: 'BTC-USDT' }).
 * @returns {Promise<IInstrumentPeriod[] | undefined>} 
 * Returns the data array on success, or undefined if the query fails or is empty.
 * 
 * @example
 * const periods = await Fetch({ timeframe: '1h' });
 * if (periods) { ... process ... }
 */
export const Fetch = async (props: Partial<IInstrumentPeriod>): Promise<IInstrumentPeriod[] | undefined> => {
  const { success, data } = await Select<IInstrumentPeriod>(props, { table: `vw_instrument_periods` });
  
  // 'All or Nothing' Pattern: Simplify caller logic by returning undefined on failure/empty
  return (success && data && data.length > 0) ? data : undefined;
};
