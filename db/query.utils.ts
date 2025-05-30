//+------------------------------------------------------------------+
//|                                                   query.utils.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import pool from "@db/db.config";

import { ResultSetHeader } from "mysql2";

export async function Select<T>(query: string, fields: Array<any>): Promise<Partial<T>[]> {
  const [results] = await pool.execute(query, fields);
  return results as T[];
}

export async function Modify(query: string, fields: Array<any>): Promise<ResultSetHeader> {
  const [results] = await pool.execute(query, fields);
  return results as ResultSetHeader;
}

export function parseColumns<T extends Record<string, any>>(obj: T, suffix: string = ` = ?`) {
  const fields = [];
  const args:Array<any> = []

  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
      fields.push(`${key}${suffix}`);
      args.push(obj[key]);
    }
  }

  return [fields, args];
}