//+------------------------------------------------------------------+
//|                                                   trade_state.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { RowDataPacket } from "mysql2";
import { Modify, Select, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export enum State {
  Enabled = "Enabled",
  Disabled = "Disabled",
  Halt = "Halt",
  Suspended = "Suspended",
}

export interface ITradeState extends RowDataPacket {
  trade_state: Uint8Array;
  state: string;
  description: string;
}

export interface IKeyProps {
  tradeState?: Uint8Array;
  state?: string;
};

//+--------------------------------------------------------------------------------------+
//| Imports seed Trade State data used in our proprietary app;                           |
//+--------------------------------------------------------------------------------------+
export function Import() {
  const TradeStates: Array<{ state: string, description: string; }> = [
    {  state: "Enabled", description: "Enabled for trading" },
    {  state: "Disabled", description: "Disabled from trading" },
    {  state: "Halted", description: "Adverse event halt" },
    {  state: "Suspended", description: "Suspended by broker" },
  ];

  TradeStates.forEach((state) => {
    Publish(state.state, state.description);
  });
}

//+--------------------------------------------------------------------------------------+
//| Adds all new contract types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(state: string, description: string): Promise<Uint8Array> {
  const tradeState = await Key({ state });

  if (tradeState === undefined) {
    const key = hex(UniqueKey(6), 3);

    await Modify(`INSERT INTO trade_state VALUES (?, ?, ?)`, [key, state, description]);

    return key;
  }
  return tradeState;
}

//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<Uint8Array | undefined> {
  const args = [];

  if (props.tradeState) {
    args.push(hex(props.tradeState, 3), `SELECT trade_state FROM trade_state WHERE trade_state = ?`);
  } else if (props.state) {
    args.push(props.state, `SELECT trade_state FROM trade_state WHERE state = ?`);
  } else return undefined;

  const [key] = await Select<ITradeState>(args[1].toString(), [args[0]]);
  return key === undefined ? undefined : key.trade_state;
}
