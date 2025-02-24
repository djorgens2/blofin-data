//+------------------------------------------------------------------+
//|                                                   query.utils.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict"

import pool from "@db/db.config";

import { customAlphabet } from "nanoid";
import { ResultSetHeader } from "mysql2";

export async function Select<T>(query: string, fields: Array<any>): Promise<Partial<T>[]> {
  const [results] = await pool.execute(query, fields);
  return results as T[];
}

export async function Modify(query: string, fields: Array<any>): Promise<ResultSetHeader> {
  const [results] = await pool.execute(query, fields);
  return results as ResultSetHeader;
}

export const UniqueKey = (length: number): string => {
  const nanoid = customAlphabet("0123456789abcdef", length);
  return nanoid();
};
