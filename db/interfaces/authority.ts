//+---------------------------------------------------------------------------------------+
//|                                                                          authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "api/api.util";

import { Select, Insert } from "db/query.utils";
import { PrimaryKey } from "api/api.util";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

export interface IAuthority {
  authority: Uint8Array;
  privilege: string;
  priority: number;
}

//+--------------------------------------------------------------------------------------+
//| Imports authority seed data to the database;                                         |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Authority.Import:", new Date().toLocaleString());

  const privileges: Array<string> = ["View", "Edit", "Create", "Delete", "Operate", "Configure"];
  const result = await Promise.all(privileges.map(async (privilege) => Add({ privilege })));
  const exists = result.filter((r) => r.response.code === 200);
  console.log(
    `-> Authority.Import complete:`,
    exists.length - result.length ? `${result.filter((r) => r.response.success).length} new privileges;` : `No new privileges;`,
    `${exists.length} privileges verified;`
  );
};

//+--------------------------------------------------------------------------------------+
//| Add an authority to local database;                                                  |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IAuthority>): Promise<IPublishResult<IAuthority>> => {
  Object.assign(props, { authority: hashKey(6) });
  const result = await Insert<IAuthority>(props, { table: `authority`, ignore: true, context: "Authority.Add" });
  return { key: PrimaryKey(props, ["authority"]), response: result };
};

//+--------------------------------------------------------------------------------------+
//| Returns an authority key using supplied params;                                      |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IAuthority>): Promise<IAuthority["authority"] | undefined> => {
  if (hasValues<Partial<IAuthority>>(props)) {
    const [result] = await Select<IAuthority>(props, { table: `authority` });
    return result ? result.authority : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns authorities meeting supplied criteria; returns all on empty prop set {};     |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IAuthority>): Promise<Array<Partial<IAuthority>> | undefined> => {
  const result = await Select<IAuthority>(props, { table: `authority` });
  return result.length ? result : undefined;
};
