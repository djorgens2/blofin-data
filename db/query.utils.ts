//+------------------------------------------------------------------+
//|                                                   query.utils.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict"

import pool from "@db/db.config";

import { customAlphabet } from "nanoid";
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
}

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

//-- Work-in-Progress
// export const UniqueHexKey = (length: number): Uint8Array => {
//   const nanoid = customAlphabet("0123456789abcdef", length);
//   const hexCode:string = nanoid();
//   const binaryLength = Math.ceil(length/2)
//   const binary = new Uint8Array(
//     for (let i = 0; i < 3; i++) {
//       binary[i] = parseInt(hexCode.substring(i * 2, (i + 1) * 2), 16);
//     }
  
//     return { hexCode, binary };
// };
