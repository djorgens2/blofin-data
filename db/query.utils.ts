//+---------------------------------------------------------------------------------------+
//|                                                                        query.utils.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TResponse } from "api";
import type { ResultSetHeader, PoolConnection } from "mysql2/promise";

import { hasValues } from "lib/std.util";
import { Log } from "module/session";

import pool from "db/db.config";

export const DB_SCHEMA = process.env.DB_SCHEMA || process.env.DB_DATABASE;

/**
 * TKey represents a [column, operator] pair.
 * Example: ['price', '>='] or ['status', '=']
 */
export type TKey<T> = [keyof T, string?];

export type TOptions<T> = {
  table?: string;
  ignore?: boolean;
  keys?: Array<TKey<T>>; // Array of tuples
  limit?: number;
  suffix?: string;
  connection?: PoolConnection;
  context?: string;
};

//+--------------------------------------------------------------------------------------+
//| handles all SQL errors; rethrows handled error formatted as TResponse                |
//+--------------------------------------------------------------------------------------+
const error = (e: any, args: Array<any>): TResponse => {
  if (e && typeof e === "object" && "code" in e) {
    console.log(`-> [Error] ${e.errno}: ${e.message}`, { sql: e.sql, args });
    throw { success: false, code: e.errno || -1, response: `error`, rows: 0 } as TResponse;
  } else {
    console.log(e);
    throw { success: false, code: -1, response: `error`, rows: 0 } as TResponse;
  }
};

//+--------------------------------------------------------------------------------------+
//| Executes prepared Select queries on the database;                                    |
//+--------------------------------------------------------------------------------------+
const select = async <T>(sql: string, args: Array<any>): Promise<Array<Partial<T>> | TResponse> => {
  try {
    const [results] = await pool.execute(sql, args);
    return results as T[];
  } catch (e) {
    return error(e, args);
  }
};

//+--------------------------------------------------------------------------------------+
//| Executes prepared DML statements on the database;                                    |
//+--------------------------------------------------------------------------------------+
const modify = async (sql: string, args: Array<any>): Promise<TResponse> => {
  try {
    const [results] = await pool.execute(sql, args);
    const rows = (results as ResultSetHeader).affectedRows ?? 0;
    return {
      success: rows ? true : false,
      code: rows ? 0 : 404,
      response: rows ? `success` : `not_found`,
      rows,
      context: `Query.Utils.Modify`,
    };
  } catch (e) {
    return error(e, args);
  }
};

//+--------------------------------------------------------------------------------------+
//| Executes bulk inserts on the database;                                               |
//+--------------------------------------------------------------------------------------+
const insert = async (sql: string, args: Array<any>): Promise<TResponse> => {
  try {
    const [results] = await pool.query(sql, args);
    const rows = (results as ResultSetHeader).affectedRows ?? 0;
    return { success: true, code: 0, response: `success`, rows, context: `Query.Utils.Insert` };
  } catch (e) {
    return error(e, args);
  }
};

//+--------------------------------------------------------------------------------------+
//| Executes transactional inserts/updates on the database;                              |
//+--------------------------------------------------------------------------------------+
const transact = async (sql: string, args: Array<any>, connection: PoolConnection): Promise<TResponse> => {
  try {
    const [results] = await connection.execute(sql, args);
    const rows = (results as ResultSetHeader).affectedRows ?? 0;
    return { success: rows ? true : false, code: 0, response: `success`, rows, context: `Query.Utils.Transact` };
  } catch (e) {
    return error(e, args);
  }
};

/**
 * Prepares the SET segment of an UPDATE query.
 * 
 * @template T - The interface model being processed.
 * @param columns - The data object containing values to be updated.
 * @returns A tuple containing [fieldStrings[], values[]].
 */
const parseColumns = <T extends object>(columns: Partial<T>, delimiter = ' = ?') => {
  const fields: string[] = [];
  const values: any[] = [];
  
  for (const [key, val] of Object.entries(columns)) {
    if (val !== undefined) {
      fields.push(`${key}${delimiter}`);
      values.push(val);
    }
  }
  return [fields, values] as [string[], any[]];
};


/**
 * Transforms key/value pairs into SQL clauses and argument arrays.
 * Supports standard equality and operator overrides via Tuples.
 * 
 * @template T - The interface model being processed.
 * @param props - The data object containing search/filter criteria.
 * @param keys - Optional array of [key, operator] tuples (e.g., ['symbol', 'LIKE']).
 * @returns A tuple containing [sqlClauses[], values[]].
 */
const parseKeys = <T extends object>(props: Partial<T>, keys?: Array<TKey<T>>) => {
  const sqlClauses: Array<string> = [];
  const values: Array<any> = [];

  for (const [col, val] of Object.entries(props)) {
    if (val === undefined) continue;

    // Search the array of tuples [key, operator]
    // We destructure the tuple into [k, s] during the find
    const match = keys?.find(([k]) => k === col);

    // The operator is the second element of the tuple
    const sign = match ? match[1] : "=";

    if (sign?.toUpperCase() === "IN" && Array.isArray(val)) {
      // Generates "column IN (?, ?, ?)"
      const placeholders = val.map(() => "?").join(", ");
      sqlClauses.push(`${col} IN (${placeholders})`);
      values.push(...val); // Spread the array into the flat args list
    } else if (sign?.toUpperCase() === "LIKE") {
      // Standard LIKE behavior
      sqlClauses.push(`${col} LIKE ?`);
      values.push(val);
    } else {
      sqlClauses.push(`${col} ${sign || "="} ?`);
      values.push(val);
    }
  }
  return [sqlClauses, values] as [string[], any[]];
};

/**
 * Splits a properties object into two separate objects based on a filter list.
 * 
 * @template T - The interface model being processed.
 * @param props - The source data object (Partial<T>).
 * @param filter - Array of keys to move into the 'excluded' (WHERE) group.
 * @returns A tuple containing [included (SET/SELECT), excluded (WHERE)].
 */
const splitKeys = <T extends object>(props: Partial<T>, filter: string[]): [Partial<T>, Partial<T>] => {
  const included: Partial<T> = {};
  const excluded: Partial<T> = {};

  (Object.keys(props) as Array<keyof T>).forEach((key) => {
    const val = props[key];

    if (filter.includes(key as string)) {
      excluded[key] = val;
    } else {
      included[key] = val;
    }
  });

  return [included, excluded];
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Insert statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Insert = async <T>(props: Partial<T>, options: TOptions<T>): Promise<TResponse> => {
  const context = options.context || `Query.Utils.Insert`;
  if (!hasValues<Partial<T>>(props)) {
    return { success: false, code: 400, response: `null_query`, rows: 0, context };
  }

  const { table, ignore } = options;
  const [fields, args] = parseColumns(props, "");
  const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")})`;

  try {
    const result = options.connection ? await transact(sql, args, options.connection) : await modify(sql, args);
    const response = result.rows ? `inserted` : ignore ? `exists` : `error`;
    const code = ignore && result.rows === 0 ? 200 : result.code;
    Log().insert && result.rows && console.log(`-> [Info] ${table} inserted`, { fields, args });
    return { success: !!result.rows, code, response, rows: result.rows, context };
  } catch (e) {
    return e as TResponse;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Update statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Update = async <T extends object>(props: Partial<T>, options: TOptions<T>): Promise<TResponse> => {
  const context = options.context || `Query.Utils.Update`;

  if (!hasValues<Partial<T>>(props)) {
    return { success: false, code: 401, response: `null_query`, rows: 0, context };
  }

  const { table, suffix, limit, keys: keyDefinitions } = options;

  // 1. Correctly extract key names from tuples for splitKeys
  const filterKeyNames = keyDefinitions?.map(([name]) => name as string) || [];
  
  // 2. splitKeys now returns [Partial<T>, Partial<T>] correctly
  const [columns, filters] = splitKeys<T>(props, filterKeyNames);

  // 3. Prepare WHERE clause (filters)
  const [keys, args] = parseKeys<T>(filters, keyDefinitions);

  // 4. Prepare SET clause (columns) - parseColumns needs to handle Partial<T>
  const [fields, values] = parseColumns<T>(columns);

  if (fields.length === 0) {
    return { success: false, code: 402, response: `no_update`, rows: 0, context };
  }

  // 5. Construct SQL - ensure WHERE is only added if keys exist
  const sql = `UPDATE ${DB_SCHEMA}.${table} SET ${fields.join(", ")}${
    keys.length ? " WHERE " + keys.join(" AND ") : ""
  } ${suffix ?? ""}${limit ? ` LIMIT ${limit}` : ""}`;

  try {
    // 6. Values (SET) come before Args (WHERE) in the array
    const result = await modify(sql, [...values, ...args]);
    
    const response = result.rows ? `updated` : result.code ? `error` : `not_found`;
    const code = result.rows ? result.code : result.code ? result.code : 404;
    
    Log().update && result.rows && console.log(response, `-> [Info] ${table} updated`, { filters, columns });
    return { success: !!result.rows, code, response, rows: result.rows, context };
  } catch (e) {
    return e as TResponse;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Select statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Select = async <T extends object>(props: Partial<T>, options: TOptions<T>): Promise<Array<Partial<T>>> => {
  const { table, keys, suffix, limit } = options;
  const [fields, args] = parseKeys(props, keys);
  const sql = `SELECT * FROM ${DB_SCHEMA}.${table}${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""} ${suffix ? suffix : ``}${
    limit ? `LIMIT ${limit}` : ``
  }`;

  try {
    Log().select && console.log(`-> [Info] Executing Select on ${DB_SCHEMA}.${table}`, { sql, fields, args });
    return (await select<T>(sql, args)) as Array<Partial<T>>;
  } catch (e) {
    return [] as Array<Partial<T>>;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Distinct queries;                                     |
//+--------------------------------------------------------------------------------------+
export const Distinct = async <T extends object>(props: Partial<T>, options: TOptions<T>): Promise<Array<Partial<T>>> => {
  const { table } = options;
  const keyTuples = options.keys || [];
  const filterNames = keyTuples.map(([name]) => name as string);
  const [columns, filters] = splitKeys<T>(props, filterNames);
  const [whereClauses, args] = parseKeys<T>(filters, keyTuples);
  const fields = Object.keys(columns).join(", ");

  const sql = `SELECT DISTINCT ${fields} FROM ${DB_SCHEMA}.${table}${
    whereClauses.length ? " WHERE " + whereClauses.join(" AND ") : ""
  } ${options.suffix ?? ""}`;

  try {
    Log().select && console.log(`-> [Info] Executing Distinct Select on ${table}`, { sql, args });
    const results = await select(sql, args);
    return results as Array<Partial<T>>;
  } catch (e) {
    console.error(`-> [Error] Distinct failed on ${table}`, e);
    return [] as Array<Partial<T>>;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes bulk load statements;                                 |
//+--------------------------------------------------------------------------------------+
export const Load = async <T>(props: Array<Partial<T>>, options: TOptions<T>): Promise<TResponse> => {
  if (!hasValues(props)) {
    return { success: false, code: 403, response: `null_query`, rows: 0 } as TResponse;
  }

  const { table, ignore } = options;
  const args = props.map((obj) => Object.values(obj));
  const fields = Object.keys(props[0]);
  const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES ?`;

  try {
    const result = await insert(sql, [args]);
    return { success: !!result.rows, code: 0, response: `success`, rows: result.rows } as TResponse;
  } catch (e) {
    return e as TResponse;
  }
};
