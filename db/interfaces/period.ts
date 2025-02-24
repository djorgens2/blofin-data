//+------------------------------------------------------------------+
//|                                                        period.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict"

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

const Period: string[][] = [
  ["1m", "1 Minute"],
  ["3m", "3 Minutes"],
  ["5m", "5 Minutes"],
  ["15m", "15 Minutes"],
  ["30m", "30 Minutes"],
  ["1H", "1 Hour"],
  ["2H", "2 Hours"],
  ["4H", "4 Hours"],
  ["6H", "6 Hours"],
  ["8H", "8 Hours"],
  ["12H", "12 Hours"],
  ["1D", "1 Day"],
  ["3D", "3 Days"],
  ["1W", "1 Week"],
  ["1M", "1 Month"],
];

export interface IPeriod extends RowDataPacket {
  period: number;
  timeframe: string;
  description: string;
}

export async function Publish(timeframe: string, description: string): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(`INSERT IGNORE INTO period VALUES (UNHEX(?), ?, ?)`, [key, timeframe, description]);
  const get = await Select<IPeriod>("SELECT period FROM period WHERE timeframe = ?", [timeframe]);

  return get.length === 0 ? set.insertId : get[0].period!;
}

export function Import() {
  Period.forEach((item) => {
    Publish(item[0], item[1]);
  });
}
