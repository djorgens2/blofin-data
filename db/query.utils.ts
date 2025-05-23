//+------------------------------------------------------------------+
//|                                                   query.utils.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import pool from "@db/db.config";

import { ResultSetHeader } from "mysql2";

export enum Operation {
  Insert = "Insert",
  Update = "Update",
  Delete = "Delete",
  Select = "Select",
}

export type ResultType = {
  key: Array<number>;
  state: number;
  action: Operation;
  message: string;
};

export async function Select<T>(query: string, fields: Array<any>): Promise<Partial<T>[]> {
  const [results] = await pool.execute(query, fields);
  return results as T[];
}

export async function Modify(query: string, fields: Array<any>): Promise<ResultSetHeader> {
  const [results] = await pool.execute(query, fields);
  return results as ResultSetHeader;
}
