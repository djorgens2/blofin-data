//+---------------------------------------------------------------------------------------+
//|                                                                               role.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "db/query.utils";
import { hashKey } from "lib/crypto.util";

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

  const success: Array<Partial<IRole>> = [];
  const errors: Array<Partial<IRole>> = [];

  const roles: Array<Partial<IRole>> = [
    { title: "Admin", auth_rank: 40 },
    { title: "Editor", auth_rank: 20 },
    { title: "Operator", auth_rank: 30 },
    { title: "Viewer", auth_rank: 10 },
  ];

  for (const role of roles) {
    const result = await Add(role);
    result ? success.push({ role: result }) : errors.push({ title: role.title });
  }

  success.length && console.log("   # Role imports: ", success.length, "verified");
  errors.length && console.log("   # Role rejects: ", errors.length, { errors });
};

//+--------------------------------------------------------------------------------------+
//| Adds roles to local database;                                                        |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IRole>) => {
  if (props.role === undefined) {
    Object.assign(props, { role: hashKey(6) });
    const result = await Insert<IRole>(props, { table: `role`, ignore: true });
    return result ? result.role : undefined;
  } else return props.role;
};

//+--------------------------------------------------------------------------------------+
//| Returns roles key based on supplied seek params;                                     |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IRole>): Promise<IRole["role"] | undefined> => {
  if (Object.keys(props).length) {
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
