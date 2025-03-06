//+------------------------------------------------------------------+
//|                                                        period.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

const Period: Array<{ timeframe: string; description: string; units: number }> = [
  { timeframe: "1m", description: "1 Minute", units: 1 },
  { timeframe: "3m", description: "3 Minutes", units: 3 },
  { timeframe: "5m", description: "5 Minutes", units: 5 },
  { timeframe: "15m", description: "15 Minutes", units: 15 },
  { timeframe: "30m", description: "30 Minutes", units: 30 },
  { timeframe: "1H", description: "1 Hour", units: 60 },
  { timeframe: "2H", description: "2 Hours", units: 120 },
  { timeframe: "4H", description: "4 Hours", units: 240 },
  { timeframe: "6H", description: "6 Hours", units: 360 },
  { timeframe: "8H", description: "8 Hours", units: 480 },
  { timeframe: "12H", description: "12 Hours", units: 720 },
  { timeframe: "1D", description: "1 Day", units: 1440 },
  { timeframe: "3D", description: "3 Days", units: 4320 },
  { timeframe: "1W", description: "1 Week", units: 10080 },
  { timeframe: "1M", description: "1 Month", units: 0 },
];

export interface IPeriod extends RowDataPacket {
  period: number;
  timeframe: string;
  description: string;
  units: number;
}

export async function Publish(timeframe: string, description: string, units: number): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(`INSERT IGNORE INTO period VALUES (UNHEX(?), ?, ?, ?)`, [key, timeframe, description, units]);
  const get = await Select<IPeriod>("SELECT period FROM period WHERE timeframe = ?", [timeframe]);

  return get.length === 0 ? set.insertId : get[0].period!;
}

export function Import() {
  Period.forEach((period) => {
    Publish(period.timeframe, period.description, period.units);
  });
}
