//+--------------------------------------------------------------------------------------+
//|                                                                            period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "#api";

import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

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

  const result = await Promise.all(periods.map(async (period) => Add(period)));
  const exists = result.filter((r) => r.response.code === 200);
  console.log(
    `-> Period.Import complete:`,
    exists.length - result.length ? `${result.filter((r) => r.response.success).length} new periods;` : `No new periods;`,
    `${exists.length} periods verified;`,
  );
};

//+--------------------------------------------------------------------------------------+
//| Adds periods/timeframes to local database;                                           |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IPeriod>): Promise<IPublishResult<IPeriod>> => {
  Object.assign(props, { period: hashKey(6) });
  const result = await Insert<IPeriod>(props, { table: `period`, ignore: true });
  return { key: PrimaryKey(props, ["period"]), response: result };
};

//+--------------------------------------------------------------------------------------+
//| Returns period/timeframe key from local db                                           |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IPeriod>): Promise<IPeriod["period"] | undefined> => {
  if (hasValues<Partial<IPeriod>>(props)) {
    const result = await Select<IPeriod>(props, { table: `period` });
        return result.success && result.data?.length ? result.data[0].period : undefined;
  }
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches periods/timeframes on supplied params; returns all on empty prop set {};     |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IPeriod>): Promise<Array<Partial<IPeriod>> | undefined> => {
  const result = await Select<IPeriod>(props, { table: `period` });
  return result.success ? result.data : undefined;
};
