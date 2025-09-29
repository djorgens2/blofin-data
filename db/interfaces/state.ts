//+---------------------------------------------------------------------------------------+
//|                                                                              state.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

export type TSystem = "Enabled" | "Disabled" | "Halted";
export type TRequest = "Expired" | "Queued" | "Pending" | "Fulfilled" | "Rejected" | "Canceled" | "Hold" | "Closed";
export type TStatus = "Open" | "Closed";
export type TAccess = "Enabled" | "Disabled" | "Restricted" | "Suspended" | "Deleted";
export type TSymbol = "Enabled" | "Disabled" | "Suspended"
export type TStates = TRequest | TSystem | TAccess | TStatus | TSymbol;

export type IState = {
  state: Uint8Array;
  status: TStates;
  description: string;
};

export interface IRequestState extends IState {
  status: TRequest;
}

export interface IAccess extends IState {
  status: TAccess;
}

export interface ISymbol extends IState {
  status: TSymbol;
}

//+--------------------------------------------------------------------------------------+
//| Imports seed States to define accounts/trading operational status;                   |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
    console.log("In State.Import:", new Date().toLocaleString());
  
    const success: Array<Partial<IState>> = [];
    const errors: Array<Partial<IState>> = [];
  
  const states: Array<Partial<IState>> = [
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
    { status: "Hold", description: "Hold; request on hold pending cancel;" },
    { status: "Closed", description: "Closed; request is closed;" },
    { status: "Open", description: "Open; order/position is open;" },
  ];

  for (const state of states) {
    const result = await Add(state);
    result ? success.push({ state: result }) : errors.push({ status: state.status });
  }

  success.length && console.log("   # State imports: ", success.length, "verified");
  errors.length && console.log("   # State rejects: ", errors.length, { errors });
};

//+--------------------------------------------------------------------------------------+
//| Adds new States to local database;                                                   |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IState>): Promise<IState["state"] | undefined> => {
  if (props.state === undefined) {
    Object.assign(props, { state: hashKey(6) });
    const result = await Insert<IState>(props, { table: `state`, ignore: true });
    return result ? result.state : undefined;
  } else return props.state;
};

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export const Key = async <T extends IState>(props: Partial<T>): Promise<T["state"] | undefined> => {
  if (Object.keys(props).length) {
    const [key] = await Select<IState>(props, { table: `state` });
    return key ? key.state : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export const Fetch = async <T extends IState>(props: Partial<T>): Promise<Array<Partial<T>> | undefined> => {
  const result = await Select<T>(props, { table: `state` });
  return result.length ? result : undefined;
};
