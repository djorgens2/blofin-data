//+---------------------------------------------------------------------------------------+
//|                                                                               role.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, Select } from "@db/query.utils";
import { hashKey } from "lib/crypto.util";

export interface IKeyProps {
  role?: Uint8Array;
  title?: string;
  auth_rank?: number;
}
export interface IRole extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Imports seed Role data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
export const Import = () => {
  const Roles: Array<Partial<IKeyProps>> = [
    { title: "Admin", auth_rank: 40, },
    { title: "Editor", auth_rank: 20 },
    { title: "Operator", auth_rank: 30 },
    { title: "Viewer", auth_rank: 10 },
  ];

  Roles.forEach((role) => Publish(role));
};

//+--------------------------------------------------------------------------------------+
//| Adds new Roles to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IKeyProps>): Promise<IKeyProps["role"]> {
  const { role, title, auth_rank } = props;
  role === undefined && title && (await Key({ title }));
  if (role === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT IGNORE INTO blofin.role VALUES (?, ?, ?)`, [key, title, auth_rank]);
    return key;
  }
  return role;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["role"] | undefined> {
  const { role, title } = props;
  const args = [];

  let sql: string = `SELECT role FROM blofin.role WHERE `;

  if (role) {
    args.push(role);
    sql += `role = ?`;
  } else if (title) {
    args.push(title);
    sql += `title = ?`;
  } else return undefined;

  const [key] = await Select<IRole>(sql, args);
  return key === undefined ? undefined : key.role;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
  const { role, title } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.role`;

  if (role) {
    args.push(role);
    sql += ` WHERE role = ?`;
  } else if (title) {
    args.push(title);
    sql += ` WHERE title = ?`;
  }

  return Select<IRole>(sql, args);
}
