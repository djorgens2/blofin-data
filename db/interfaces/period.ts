//+--------------------------------------------------------------------------------------+
//|                                                                            period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify } from "@db/query.utils";
import { hashKey } from "@/lib/crypto.util";

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

export interface IKeyProps {
  period?: Uint8Array;
  timeframe?: string;
}

export interface IPeriod extends IKeyProps, RowDataPacket {
  description: string;
  units: number;
}

//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
export function Import() {
  Period.forEach((period) => {
    const {timeframe, description, units} = period;
    Publish(timeframe, description, units);
  });
}

//+--------------------------------------------------------------------------------------+
//| Adds all new contract types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(timeframe: string, description: string, units: number): Promise<IKeyProps["period"]> {
  const period = await Key({ timeframe });

  if (period === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.period VALUES (?, ?, ?, ?)`, [key, timeframe, description, units]);

    return key;
  }
  return period;
}

//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["period"] | undefined> {
  const { period, timeframe } = props;
  const args = [];

  let sql: string = `SELECT period FROM blofin.period WHERE `;

  if (period) {
    args.push(period);
    sql += `period = ?`;
  } else if (timeframe) {
    args.push(timeframe);
    sql += `timeframe = ?`;
  } else return undefined;

  const [key] = await Select<IPeriod>(sql, args);
  return key === undefined ? undefined : key.period;
}
