//+---------------------------------------------------------------------------------------+
//|                                                                          authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

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

  const success: Array<Partial<IAuthority>> = [];
  const errors: Array<Partial<IAuthority>> = [];

  const privileges: Array<string> = ["View", "Edit", "Create", "Delete", "Operate", "Configure"];

  for (const [priority, privilege] of privileges.entries()) {
      const result = await Add({privilege, priority});
      result ? success.push({authority: result}) : errors.push({privilege});
    };
  
    success.length && console.log("   # Authority imports: ", success.length, "verified");
    errors.length && console.log("   # Authority rejects: ", errors.length, { errors });
  };

//+--------------------------------------------------------------------------------------+
//| Add an authority to local database;                                                  |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IAuthority>): Promise<IAuthority["authority"] | undefined>  => {
  if (props.authority === undefined) {
    Object.assign(props, { authority: hashKey(6) });
    const result = await Insert<IAuthority>(props, { table: `authority`, ignore: true });
    return result ? result.authority : undefined;
  } else return props.authority;
};

//+--------------------------------------------------------------------------------------+
//| Returns an authority key using supplied params;                                      |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IAuthority>): Promise<IAuthority["authority"] | undefined> => {
  if (Object.keys(props).length) {
    const [key] = await Select<IAuthority>(props, { table: `authority` });
    return key ? key.authority : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns authorities meeting supplied criteria; returns all on empty prop set {};     |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IAuthority>): Promise<Array<Partial<IAuthority>> | undefined> => {
  const result = await Select<IAuthority>(props, {table: `authority` });
  return result.length ? result : undefined;
};
