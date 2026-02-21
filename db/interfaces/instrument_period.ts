//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Load } from "#db";

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

//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument periods;                                                 |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  const result = await Select<IInstrumentPeriod>({}, { table: `vw_audit_instrument_periods` });
  return result.success ? await Load(result.data!, { table: `instrument_period` }) : undefined;
  return result;
};

//+--------------------------------------------------------------------------------------+
//| Returns instrument positions meeting supplied criteria; returns all on empty set {}; |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IInstrumentPeriod>): Promise<Array<Partial<IInstrumentPeriod>> | undefined> => {
  const result = await Select<IInstrumentPeriod>(props, { table: `vw_instrument_periods` });
  return result.success ? result.data : undefined;
};
