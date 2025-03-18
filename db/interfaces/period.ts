//+--------------------------------------------------------------------------------------+
//|                                                                            period.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { RowDataPacket } from "mysql2";
import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

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
  period: Uint8Array;
  timeframe: string;
  description: string;
  units: number;
}

export interface IKeyProps {
  period?: Uint8Array;
  timeframe?: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
export function Import() {
  Period.forEach((period) => {
    Publish(period.timeframe, period.description, period.units);
  });
}

//+--------------------------------------------------------------------------------------+
//| Adds all new contract types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(timeframe: string, description: string, units: number): Promise<Uint8Array> {
  const period = await Key({ timeframe });

  if (period === undefined) {
    const key = hex(UniqueKey(6), 3);
    await Modify(`INSERT INTO period VALUES (?, ?, ?, ?)`, [key, timeframe, description, units]);

    return key;
  }
  return period;
}

//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<Uint8Array | undefined> {
  const args = [];

  if (props.period) {
    args.push(hex(props.period, 3), `SELECT period FROM period WHERE period = ?`);
  } else if (props.timeframe) {
    args.push(props.timeframe, `SELECT period FROM period WHERE timeframe = ?`);
  } else return undefined;

  const [key] = await Select<IPeriod>(args[1].toString(), [args[0]]);
  return key === undefined ? undefined : key.period;
}
