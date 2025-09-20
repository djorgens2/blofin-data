//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Load, Update } from "@db/query.utils";

export interface IInstrumentPeriod {
  instrument: Uint8Array;
  symbol: string;
  base_symbol: string;
  base_currency: Uint8Array;
  quote_symbol: string;
  quote_currency: Uint8Array;
  period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
  bulk_collection_rate: number;
  interval_collection_rate: number;
  sma_factor: number;
  active_collection: boolean;
  suspense: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument periods;                                                 |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  const data = await Select<IInstrumentPeriod>({}, {table: `vw_audit_instrument_periods`})
  const result = await Load(data, {table: `instrument_period`});
  return result;
}

//+--------------------------------------------------------------------------------------+
//| Returns instrument positions meeting supplied criteria; returns all on empty set {}; |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IInstrumentPeriod>): Promise<Array<Partial<IInstrumentPeriod>> | undefined> => {
  const result = await Select<IInstrumentPeriod>(props, { table: `vw_instrument_periods` });
  return result.length ? result : undefined;
};
