//+---------------------------------------------------------------------------------------+
//|                                                                               role.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "api";
import { PrimaryKey } from "api";

import { Select, Insert } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

export interface IRole {
  role: Uint8Array;
  title: string;
  auth_rank: number;
}

//+--------------------------------------------------------------------------------------+
//| Imports seed Role data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Role.Import:", new Date().toLocaleString());

  const roles: Array<Partial<IRole>> = [
    { title: "Admin", auth_rank: 40 },
    { title: "Editor", auth_rank: 20 },
    { title: "Operator", auth_rank: 30 },
    { title: "Viewer", auth_rank: 10 },
  ];
  const result = await Promise.all(roles.map(async (role) => Add(role)));
  const exists = result.filter((r) => r.response.code === 200);
  console.log(
    `-> Role.Import complete:`,
    exists.length - result.length ? `${result.filter((r) => r.response.success).length} new roles;` : `No new roles;`,
    `${exists.length} roles verified;`
  );
};

//+--------------------------------------------------------------------------------------+
//| Adds roles to local database;                                                        |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IRole>): Promise<IPublishResult<IRole>> => {
  Object.assign(props, { role: hashKey(6) });
  const result = await Insert<IRole>(props, { table: `role`, ignore: true });
  return { key: PrimaryKey(props, ["role"]), response: result };
};

//+--------------------------------------------------------------------------------------+
//| Returns roles key based on supplied seek params;                                     |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IRole>): Promise<IRole["role"] | undefined> => {
  if (hasValues<Partial<IRole>>(props)) {
    const [key] = await Select<IRole>(props, { table: `role` });
    return key ? key.role : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches roles by matching supplied props; returns all if no props supplied;          |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IRole>): Promise<Array<Partial<IRole>> | undefined> => {
  const result = await Select<IRole>(props, { table: `role` });
  return result.length ? result : undefined;
};
