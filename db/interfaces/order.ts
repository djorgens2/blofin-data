//+---------------------------------------------------------------------------------------+
//|                                                                              state.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, Select } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

export const Status = {
  Enabled: "Enabled",
  Disabled: "Disabled",
  Halted: "Halted",
  Restricted: "Restricted",
  Suspended: "Suspended",
  Deleted: "Deleted",
  Expired: "Expired",
} as const;
export type Status = (typeof Status)[keyof typeof Status];
export const States: Array<{ status: Status; description: string }> = [
  { status: "Enabled", description: "Enabled for trading" },
  { status: "Disabled", description: "Disabled from trading" },
  { status: "Halted", description: "Adverse event halt" },
  { status: "Restricted", description: "Restricted use" },
  { status: "Suspended", description: "Suspended by broker" },
  { status: "Deleted", description: "Deleted pending removal" },
  { status: "Expired", description: "Expired" },
];

export interface IKeyProps {
  state?: Uint8Array;
  status?: string | Status;
}

export interface IState extends IKeyProps, RowDataPacket {
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports seed States to define accounts/trading operational status;                   |
//+--------------------------------------------------------------------------------------+
export const Import = () => States.forEach((state) => Publish(state));

//+--------------------------------------------------------------------------------------+
//| Adds new States to local database;                                                   |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: { status: Status; description: string }): Promise<IKeyProps["state"]> {
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
export async function Key(props: IKeyProps): Promise<IKeyProps["state"] | undefined> {
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

  const [key] = await Select<IState>(sql, args);
  return key === undefined ? undefined : key.state;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
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

  return Select<IState>(sql, args);
}
