//+---------------------------------------------------------------------------------------+
//|                                                                          authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, Select } from "@db/query.utils";
import { hashKey } from "@/lib/crypto.util";

export const Privilege = {
  Edit: "Edit",
  Create: "Create",
  Delete: "Delete",
  View: "View",
  Configure: "Configure",
  Operate: "Operate",
} as const;
export type Privilege = (typeof Privilege)[keyof typeof Privilege];
export const Privileges: Array<Privilege> = ["Edit", "Create", "Delete", "View", "Configure", "Operate"];

export interface IKeyProps {
  authority?: Uint8Array;
  privilege?: Privilege;
}
export interface IAuthority extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Imports seed Privilege data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
export const Import = () => Privileges.forEach((privilege) => Publish(privilege));

//+--------------------------------------------------------------------------------------+
//| Adds new Privileges to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(privilege: Privilege): Promise<IKeyProps["authority"]> {
  const authority = await Key({ privilege });
  if (authority === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.authority VALUES (?, ?)`, [key, privilege]);
    return key;
  }
  return authority;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["authority"] | undefined> {
  const { authority, privilege } = props;
  const args = [];

  let sql: string = `SELECT privilege FROM blofin.authority WHERE `;

  if (authority) {
    args.push(authority);
    sql += `authority = ?`;
  } else if (privilege) {
    args.push(privilege);
    sql += `privilege = ?`;
  } else return undefined;

  const [key] = await Select<IAuthority>(sql, args);
  return key === undefined ? undefined : key.authority;
}

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
  const { authority, privilege } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.authority`;

  if (authority) {
    args.push(authority);
    sql += ` WHERE authority = ?`;
  } else if (privilege) {
    args.push(privilege);
    sql += ` WHERE privilege = ?`;
  }

  return Select<IAuthority>(sql, args);
}
