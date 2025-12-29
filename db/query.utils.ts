//+---------------------------------------------------------------------------------------+
//|                                                                        query.utils.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { ResultSetHeader, PoolConnection } from "mysql2/promise";
import { hasValues } from "lib/std.util";

import pool from "db/db.config";

export const DB_SCHEMA = process.env.DB_SCHEMA || process.env.DB_DATABASE;

export type TKey = { key: string; sign?: string };
export type TOptions = { table?: string; ignore?: boolean; keys?: Array<TKey>; limit?: number; suffix?: string; connection?: PoolConnection };
export type TCategory = `success` | `error` | `updated` | `inserted` | `not_found` | `no_update` | `exists` | `null_query`;
export type TSign = `=` | `!=` | `<` | `<=` | `>` | `>=` | `LIKE` | `IN` | `NOT IN`;
export type TSearchKey = { key: string; sign: TSign };
export type TResponse = {
  success: boolean;
  code: number;
  category: TCategory;
  rows: number;
};
//export type CompositeKey<T> = { [K in keyof T]?: T[K] };
export type TPrimaryKey<T> = Partial<T>;
export interface IPublishResult<T, K = TPrimaryKey<T>> {
  key?: K;
  response: TResponse;
}

//+--------------------------------------------------------------------------------------+
//| Builds the pkey for a composite key                                                  |
//+--------------------------------------------------------------------------------------+
export const PrimaryKey = <T>(obj: T, keys: (keyof T)[]): TPrimaryKey<T> => {
  const cpk: TPrimaryKey<T> = {};
  keys.forEach((key) => {
    if (obj[key] !== undefined) {
      cpk[key] = obj[key] as any;
    }
  });
  return cpk;
};

//+--------------------------------------------------------------------------------------+
//| handles all errors;                                                                  |
//+--------------------------------------------------------------------------------------+
const error = (e: any, args: Array<any>): TResponse => {
  if (e && typeof e === "object" && "code" in e) {
    console.log(`-> [Error] ${e.errno}: ${e.message}`, { sql: e.sql, args });
    throw { success: false, code: e.errno || -1, category: `error`, rows: 0 };
  } else {
    console.log(e);
    throw { success: false, code: -1, category: `error`, rows: 0 };
  }
};

//+--------------------------------------------------------------------------------------+
//| Executes prepared Select queries on the database;                                    |
//+--------------------------------------------------------------------------------------+
const select = async <T>(sql: string, args: Array<any>): Promise<Array<Partial<T>>> => {
  const [results] = await pool.execute(sql, args);
  return results as T[];
};

//+--------------------------------------------------------------------------------------+
//| Executes prepared DML statements on the database;                                    |
//+--------------------------------------------------------------------------------------+
const modify = async (sql: string, args: Array<any>): Promise<TResponse> => {
  try {
    const [results] = await pool.execute(sql, args);
    const rows = (results as ResultSetHeader).affectedRows ?? 0;
    return { success: rows ? true : false, code: 0, category: `success`, rows };
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
    return { success: true, code: 0, category: `success`, rows };
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
    return { success: rows ? true : false, code: 0, category: `success`, rows };
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
//| Parses and returns key/value sql constructs into arrays;                             |
//+--------------------------------------------------------------------------------------+
const parseKeys = (props: object, keys?: Array<TKey>) => {
  const key: Array<string> = [];
  const value: Array<any> = [];

  Object.keys(props).map((obj, id) => {
    if (Object.values(props)[id] !== undefined) {
      const { sign } = keys?.find((search) => search.key === obj) || { sign: undefined };
      key.push(`${obj} ${sign || `=`} ?`);
      value.push(Object.values(props)[id]);
    }
  });
  return [key, value];
};

//+--------------------------------------------------------------------------------------+
//| Returns columns and keys in separate arrays;                                         |
//+--------------------------------------------------------------------------------------+
const splitKeys = <T>(props: Partial<T>, filter: Array<string>) => {
  return Object.keys(props).reduce(
    ([included, excluded]: [Record<string, any>, Record<string, any>], key: string): [Record<string, any>, Record<string, any>] => {
      if (filter.includes(key)) {
        excluded[key] = props[key as keyof typeof props];
      } else {
        props[key as keyof typeof props] !== undefined && (included[key] = props[key as keyof typeof props]);
      }
      return [included, excluded];
    },
    [{} as Record<string, any>, {} as Record<string, any>]
  );
};

//+--------------------------------------------------------------------------------------+
//| Returns summarized TReponses from DML results;                                       |
//+--------------------------------------------------------------------------------------+
export const Summary = (results: (TResponse | undefined | null)[]): Record<string, number> => {
  return results.reduce((acc, sum) => {
    if (sum) {
      const cat = sum.category;
      acc[cat] = (acc[cat] || 0) + 1;
      acc.total_rows = (acc.total_rows || 0) + (sum.rows || 0);
    }
    return acc;
  }, {} as Record<string, any>);
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Insert statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Insert = async <T>(props: Partial<T>, options: TOptions): Promise<TResponse> => {
  const { table, ignore } = options;
  const [fields, args] = parseColumns(props, "");
  const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")})`;

  try {
    const result = options.connection ? await transact(sql, args, options.connection) : await modify(sql, args);
    const category = result.rows ? `inserted` : ignore ? `exists` : `error`;
    const code = ignore && result.rows === 0 ? 200 : result.code;
    result.rows && console.log(`-> [Info] ${table} inserted`, { fields, args });
    return { success: result.rows ? true : false, code, category, rows: result.rows };
  } catch (e) {
    return e as TResponse;
  }  
};  

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Update statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Update = async <T>(props: Partial<T>, options: TOptions): Promise<TResponse> => {
  if (!hasValues<Partial<T>>(props)) {
    return { success: false, code: 404, category: `null_query`, rows: 0 };
  }

  const { table, suffix, limit } = options;
  const [columns, filters] = splitKeys<T>(props, options.keys ? options.keys.map((k) => k.key) : []);
  const [keys, args] = parseKeys(filters, options.keys);
  const [fields, values] = parseColumns(columns);

  if (fields.length === 0) {
    return { success: false, code: 402, category: `no_update`, rows: 0 };
  }
  
  const sql = `UPDATE ${DB_SCHEMA}.${table} SET ${fields.join(", ")}${fields.length ? " WHERE ".concat(keys.join(" AND ")) : ""} ${suffix ? suffix : ``}${
    limit ? `LIMIT ${limit}` : ``
  }`;

  try {
    const result = await modify(sql, [...values, ...args]);
    const category = result.rows ? `updated` : `not_found`;
    result.rows && console.log(category, `-> [Info] ${table} updated`, { filters, columns });
    return { success: result.rows ? true : false, code: result.code, category, rows: result.rows };
  } catch (e) {
    return e as TResponse;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Select statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Select = async <T>(props: Partial<T>, options: TOptions): Promise<Array<Partial<T>>> => {
  const { table, keys, suffix, limit } = options;
  const [fields, args] = parseKeys(props, keys);
  const sql = `SELECT * FROM ${DB_SCHEMA}.${table}${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""} ${suffix ? suffix : ``}${
    limit ? `LIMIT ${limit}` : ``
  }`;

  try {
    const result = await select<T>(sql, args);
    return result.length ? result : ([] as Array<Partial<T>>);
  } catch (e) {
    return [] as Array<Partial<T>>;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Distinct queries;                                     |
//+--------------------------------------------------------------------------------------+
export const Distinct = async <T>(props: Partial<T>, options: TOptions): Promise<Array<Partial<T>>> => {
  const [columns, filters] = splitKeys<T>(props, options.keys ? options.keys.map((k) => k.key) : []);
  const { table } = options;
  const fields = Object.keys(props).join(", ");
  const [keys, args] = parseKeys(filters, options?.keys);
  const sql = `SELECT DISTINCT ${fields} FROM ${DB_SCHEMA}.${table}${keys.length ? " WHERE ".concat(keys.join(" AND ")) : ""} ${
    options.suffix ? options.suffix : ``
  }`;

  try {
    const result = await select(sql, args);
    return result.length ? result : ([] as Array<Partial<T>>);
  } catch (e) {
    return [] as Array<Partial<T>>;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes bulk load statements;                                 |
//+--------------------------------------------------------------------------------------+
export const Load = async <T>(props: Array<Partial<T>>, options: TOptions): Promise<TResponse> => {
  if (props.length) {
    const { table, ignore } = options;

    const args = props.map((obj) => Object.values(obj));
    const fields = Object.keys(props[0]);
    const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES ?`;

    try {
      const result = await insert(sql, [args]);
      return { success: result.rows ? true : false, code: 0, category: `success`, rows: result.rows };
    } catch (e) {
      return e as TResponse;
    }
  } else return { success: false, code: 405, category: `null_query`, rows: 0 };
};
