//+---------------------------------------------------------------------------------------+
//|                                                                              state.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Modify, Select } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

export type TSystem = "Enabled" | "Disabled" | "Halted";
export type TRequest = "Expired" | "Queued" | "Pending" | "Fulfilled" | "Rejected" | "Canceled" | "Closed";
export type TAccount = "Enabled" | "Disabled" | "Restricted" | "Suspended" | "Deleted";
export type TPosition = "Open" | "Closed";

export type TState = {
  state: Uint8Array;
  status: TRequest | TSystem | TAccount | TPosition;
  description: string;
};

export interface IRequestState extends TState {
  status: TRequest;
}

export interface IAccountState extends TState {
  status: TAccount;
}

//+--------------------------------------------------------------------------------------+
//| Imports seed States to define accounts/trading operational status;                   |
//+--------------------------------------------------------------------------------------+
export const Import = () => {
  const states: Array<Partial<TState>> = [
    { status: "Enabled", description: "Enabled for trading" },
    { status: "Disabled", description: "Disabled from trading" },
    { status: "Halted", description: "Adverse event halt" },
    { status: "Restricted", description: "Restricted use" },
    { status: "Suspended", description: "Suspended by broker" },
    { status: "Deleted", description: "Deleted pending removal" },
    { status: "Expired", description: "Expired; order requests, tokens, keys, et al" },
    { status: "Queued", description: "Queued; request queued for handling" },
    { status: "Pending", description: "Pending; request is live/pending" },
    { status: "Fulfilled", description: "Fulfilled; order fullfilled; check orders for completion" },
    { status: "Rejected", description: "Rejected; request denied; check error log" },
    { status: "Canceled", description: "Canceled; request canceled;" },
    { status: "Closed", description: "Closed; request is closed;" },
    { status: "Open", description: "Open; order/position is open;" },
  ];
  states.forEach((state) => Publish(state));
};

//+--------------------------------------------------------------------------------------+
//| Adds new States to local database;                                                   |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<TState>): Promise<TState["state"]> {
  const { status, description } = props;
  const state = await Key({ status });

  if (state === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.state VALUES (?, ?, ?)`, [key, status, description]);
    return key;
  }
  return state;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key<T extends TState>(props: Partial<T>): Promise<T["state"] | undefined> {
  const { status, state } = props;
  const args = [];

  let sql: string = `SELECT state FROM blofin.state WHERE `;

  if (state) {
    args.push(state);
    sql += `state = ?`;
  } else if (status) {
    args.push(status);
    sql += `status = ?`;
  } else return undefined;

  const [key] = await Select<T>(sql, args);
  return key === undefined ? undefined : key.state;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch<T extends TState>(props: Partial<T>): Promise<Array<Partial<T>>> {
  const { state, status } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.state`;

  if (state) {
    args.push(state);
    sql += ` WHERE state = ?`;
  } else if (status) {
    args.push(status);
    sql += ` WHERE status = ?`;
  }

  return Select<T>(sql, args);
}
