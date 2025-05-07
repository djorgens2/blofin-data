//+---------------------------------------------------------------------------------------+
//|                                                                               role.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, Select, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export const Role = {
  Admin: "Admin",
  Editor: "Editor",
  Operator: "Operator",
  Viewer: "Viewer",
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const Roles: Array<Role> = ["Admin", "Editor", "Operator", "Viewer"];

export interface IKeyProps {
  role?: Uint8Array;
  title?: Role;
}
export interface IRole extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Imports seed Role data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
export const Import = () => Roles.forEach((role) => Publish(role));

//+--------------------------------------------------------------------------------------+
//| Adds new Roles to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(title: Role): Promise<IKeyProps["role"]> {
  const role = await Key({ title });
  if (role === undefined) {
    const key = hex(UniqueKey(6), 3);
    await Modify(`INSERT INTO blofin.role VALUES (?, ?)`, [key, title]);
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
    args.push(hex(role, 3));
    sql += `role = ?`;
  } else if (title) {
    args.push(title);
    sql += `title = ?`;
  } else return undefined;

  const [key] = await Select<IRole>(sql, args);
  return key === undefined ? undefined : key.role;
}
