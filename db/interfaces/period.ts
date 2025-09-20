//+--------------------------------------------------------------------------------------+
//|                                                                            period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

export interface IPeriod {
  period: Uint8Array;
  timeframe: string;
  description: string;
  timeframe_units: number;
}

//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Period.Import:", new Date().toLocaleString());

  const success: Array<Partial<IPeriod>> = [];
  const errors: Array<Partial<IPeriod>> = [];
  const periods: Array<Partial<IPeriod>> = [
    { timeframe: "1m", description: "1 Minute", timeframe_units: 1 },
    { timeframe: "3m", description: "3 Minutes", timeframe_units: 3 },
    { timeframe: "5m", description: "5 Minutes", timeframe_units: 5 },
    { timeframe: "15m", description: "15 Minutes", timeframe_units: 15 },
    { timeframe: "30m", description: "30 Minutes", timeframe_units: 30 },
    { timeframe: "1H", description: "1 Hour", timeframe_units: 60 },
    { timeframe: "2H", description: "2 Hours", timeframe_units: 120 },
    { timeframe: "4H", description: "4 Hours", timeframe_units: 240 },
    { timeframe: "6H", description: "6 Hours", timeframe_units: 360 },
    { timeframe: "8H", description: "8 Hours", timeframe_units: 480 },
    { timeframe: "12H", description: "12 Hours", timeframe_units: 720 },
    { timeframe: "1D", description: "1 Day", timeframe_units: 1440 },
    { timeframe: "3D", description: "3 Days", timeframe_units: 4320 },
    { timeframe: "1W", description: "1 Week", timeframe_units: 10080 },
    { timeframe: "1M", description: "1 Month", timeframe_units: 0 },
  ];

  for (const period of periods) {
    const result = await Add(period);
    result ? success.push({ period: result }) : errors.push({ timeframe: period.timeframe });
  }

  success.length && console.log("   # Period imports: ", success.length, "verified");
  errors.length && console.log("   # Period rejects: ", errors.length, { errors });
};

//+--------------------------------------------------------------------------------------+
//| Adds periods/timeframes to local database;                                           |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IPeriod>): Promise<IPeriod["period"] | undefined> => {
  if (props.period === undefined) {
    Object.assign(props, { period: hashKey(6) });
    const result = await Insert<IPeriod>(props, { table: `period`, ignore: true });
    return result ? result.period : undefined;
  } else return props.period;
};

//+--------------------------------------------------------------------------------------+
//| Returns period/timeframe key from local db                                           |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IPeriod>): Promise<IPeriod["period"] | undefined> => {
  if (Object.keys(props).length) {
    const [key] = await Select<IPeriod>(props, { table: `period` });
    return key ? key.period : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches periods/timeframes on supplied params; returns all on empty prop set {};     |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IPeriod>): Promise<Array<Partial<IPeriod>> | undefined> => {
  const result = await Select<IPeriod>(props, { table: `period` });
  return result.length ? result : undefined;
};
