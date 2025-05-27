//+--------------------------------------------------------------------------------------+
//|                                                                       environment.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify } from "@db/query.utils";
import { hashKey } from "lib/crypto.util";

export interface IKeyProps {
  environment?: Uint8Array;
  environ?: string;
}

export interface IEnvironment extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  ["Production", "Development", "Test"].forEach((environ) => Add(environ));
};

//+--------------------------------------------------------------------------------------+
//| Adds seed environments to local database;                                            |
//+--------------------------------------------------------------------------------------+
export async function Add(environ: string): Promise<IKeyProps["environment"]> {
  const environment = await Key({ environ });
  if (environment === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.environment VALUES (?, ?)`, [key, environ]);  
    return key;
  }
  return environment;
}

//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["environment"] | undefined> {
  const { environment, environ } = props;
  const args = [];

  let sql: string = `SELECT environment FROM blofin.environment WHERE `;

  if (environment) {
    args.push(environment);
    sql += `environment = ?`;
  } else if (environ) {
    args.push(environ);
    sql += `environ = ?`;
  } else return undefined;

  const [key] = await Select<IEnvironment>(sql, args);
  return key === undefined ? undefined : key.environment;
}

//+--------------------------------------------------------------------------------------+
//| Examines environment search methods in props; executes once on supplied keys;        |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
  const { environment, environ } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.environment`;

  if (environment) {
    args.push(environment);
    sql += ` WHERE environment = ?`;
  } else if (environ) {
    args.push(environ);
    sql += ` WHERE environ = ?`;
  }

  return await Select<IEnvironment>(sql, args);
}
