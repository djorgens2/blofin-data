//+------------------------------------------------------------------+
//|                                                   trade_state.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Modify, Select, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export enum State {
  Enabled = "Enabled",
  Disabled = "Disabled",
  Halt = "Halt",
  Suspended = "Suspended",
}

export interface ITradeState extends RowDataPacket {
  trade_state: number;
  state: string;
  description: string;
}

export async function Publish(state: string, description: string): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(`INSERT IGNORE INTO trade_state VALUES (UNHEX(?), ?, ?)`, [key, state, description]);
  const get = await Select<ITradeState>("SELECT trade_state FROM trade_state WHERE state = ?", [state]);

  return get.length === 0 ? set.insertId : get[0].trade_state!;
}

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

export function Fetch(tradeState: number) {
  return Select<ITradeState>(`SELECT * FROM trade_state WHERE trade_state = ?`, [tradeState]);
}

export async function Key(state: State): Promise<number> {
  const [tradeState] = await Select<ITradeState>("SELECT trade_state FROM trade_state WHERE state = ?", [state]);
  return tradeState.trade_state!;
}
