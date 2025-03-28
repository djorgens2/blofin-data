//+---------------------------------------------------------------------------------------+
//|                                                                        trade_state.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, Select, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export enum State {
  Enabled = "Enabled",
  Disabled = "Disabled",
  Halt = "Halt",
  Suspended = "Suspended",
}

export interface IKeyProps {
  trade_state?: Uint8Array;
  state?: string;
}

export interface ITradeState extends IKeyProps, RowDataPacket {
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports seed Trade State data used in our proprietary app;                           |
//+--------------------------------------------------------------------------------------+
export function Import() {
  const TradeStates: Array<{ state: string; description: string }> = [
    { state: "Enabled", description: "Enabled for trading" },
    { state: "Disabled", description: "Disabled from trading" },
    { state: "Halted", description: "Adverse event halt" },
    { state: "Suspended", description: "Suspended by broker" },
  ];

  TradeStates.forEach((state) => {
    Publish(state.state, state.description);
  });
}

//+--------------------------------------------------------------------------------------+
//| Adds all new contract types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(state: string, description: string): Promise<IKeyProps["trade_state"]> {
  const trade_state = await Key({ state });

  if (trade_state === undefined) {
    const key = hex(UniqueKey(6), 3);

    await Modify(`INSERT INTO trade_state VALUES (?, ?, ?)`, [key, state, description]);

    return key;
  }
  return trade_state;
}

//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["trade_state"] | undefined> {
  const args = [];

  let sql: string = `SELECT trade_state FROM trade_state WHERE `;

  if (props.trade_state) {
    args.push(hex(props.trade_state, 3));
    sql += `trade_state = ?`;
  } else if (props.state) {
    args.push(props.state);
    sql += `state = ?`;
  } else return undefined;

  const [key] = await Select<ITradeState>(sql, args);
  return key === undefined ? undefined : key.trade_state;
}
