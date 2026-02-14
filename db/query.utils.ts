//+---------------------------------------------------------------------------------------+
//|                                                                        query.utils.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TResponse } from "api/api.util";

import { ResultSetHeader, PoolConnection } from "mysql2/promise";
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
export type TSign = `=` | `!=` | `<` | `<=` | `>` | `>=` | `LIKE` | `IN` | `NOT IN`;
export type TSearchKey = { key: string; sign: TSign };

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

//+--------------------------------------------------------------------------------------+
//| Parses and returns key/value constructs into arrays;                                 |
//+--------------------------------------------------------------------------------------+
const parseColumns = (obj: object, suffix = " = ?") => {
  const fields: string[] = [];
  const args: any[] = [];
  Object.keys(obj).forEach((key, id) => {
    if (Object.values(obj)[id] !== undefined) {
      fields.push(`${key}${suffix}`);
      args.push(Object.values(obj)[id]);
    }
  });
  return [fields, args];
};

//+--------------------------------------------------------------------------------------+
//| Parses and returns key/value sql constructs into arrays using Tuples;                |
//+--------------------------------------------------------------------------------------+
const parseKeys = <T>(props: Partial<T>, keys?: Array<TKey<T>>) => {
  const sqlClauses: Array<string> = [];
  const values: Array<any> = [];

  if (!keys) return [sqlClauses, values];

  for (const [col, sign] of keys) {
    const value = props[col];

    if (value !== undefined) {
      sqlClauses.push(`${String(col)} ${sign || "="} ?`);
      values.push(value);
    }
  }

  return [sqlClauses, values];
};

/**
 * Splits props into two objects:
 * [0] Columns to be UPDATED (included)
 * [1] Keys for the WHERE clause (excluded)
 */
const splitKeys = <T>(props: Partial<T>, filter: Array<keyof T>): [Partial<T>, Partial<T>] => {
  return (Object.keys(props) as Array<keyof T>).reduce(
    ([included, excluded], key) => {
      const value = props[key];

      if (filter.includes(key)) {
        excluded[key] = value;
      } else if (value !== undefined) {
        included[key] = value;
      }

      return [included, excluded];
    },
    [{} as Partial<T>, {} as Partial<T>],
  );
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
export const Update = async <T>(props: Partial<T>, options: TOptions<T>): Promise<TResponse> => {
  const context = options.context || `Query.Utils.Update`;

  if (!hasValues<Partial<T>>(props)) {
    return { success: false, code: 401, response: `null_query`, rows: 0, context };
  }

  const { table, suffix, limit, keys: keyDefinitions } = options;
  const filterKeyNames = keyDefinitions?.map(([name]) => name) || [];
  const [columns, filters] = splitKeys<T>(props, filterKeyNames);
  const [keys, args] = parseKeys(filters, options.keys);
  const [fields, values] = parseColumns(columns);

  if (fields.length === 0) {
    return { success: false, code: 402, response: `no_update`, rows: 0, context };
  }

  const sql = `UPDATE ${DB_SCHEMA}.${table} SET ${fields.join(", ")}${fields.length ? " WHERE ".concat(keys.join(" AND ")) : ""} ${suffix ? suffix : ``}${
    limit ? `LIMIT ${limit}` : ``
  }`;

  try {
    const result = await modify(sql, [...values, ...args]);
    const response = result.rows ? `updated` : result.code ? `error` : `not_found`;
    const code = result.rows ? result.code : result.code ? result.code : 404;
    Log().update && result.rows && console.log(response, `-> [Info] ${table} updated`, { filters, columns });
    return { success: result.rows ? true : false, code, response, rows: result.rows, context };
  } catch (e) {
    return e as TResponse;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Select statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Select = async <T>(props: Partial<T>, options: TOptions<T>): Promise<Array<Partial<T>>> => {
  const { table, keys, suffix, limit } = options;
  const [fields, args] = parseKeys(props, keys);
  const sql = `SELECT * FROM ${DB_SCHEMA}.${table}${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""} ${suffix ? suffix : ``}${
    limit ? `LIMIT ${limit}` : ``
  }`;

  try {
    Log().select && console.log(`-> [Info] Executing Select on ${DB_SCHEMA}.${table}`, { fields, args });
    return (await select<T>(sql, args)) as Array<Partial<T>>;
  } catch (e) {
    return [] as Array<Partial<T>>;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Distinct queries;                                     |
//+--------------------------------------------------------------------------------------+
export const Distinct = async <T>(props: Partial<T>, options: TOptions<T>): Promise<Array<Partial<T>>> => {
  const { table, keys: keyDefinitions, suffix } = options;
  const filterKeyNames = keyDefinitions?.map(([name]) => name) || [];
  const [columns, filters] = splitKeys<T>(props, filterKeyNames);
  const [whereSql, whereArgs] = parseKeys<T>(filters, keyDefinitions);
  const fields = Object.keys(columns).length ? Object.keys(columns).join(", ") : "*";
  const whereClause = whereSql.length ? ` WHERE ${whereSql.join(" AND ")}` : "";
  const sql = `SELECT DISTINCT ${fields} FROM ${DB_SCHEMA}.${table}${whereClause}${suffix ? ` ${suffix}` : ""}`;

  try {
    Log().select && console.log(`-> [Info] Executing Distinct Select on ${table}`, { whereSql, whereArgs });
    const results = await select(sql, whereArgs);
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
