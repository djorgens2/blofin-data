//+---------------------------------------------------------------------------------------+
//|                                                                        query.utils.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { ResultSetHeader } from "mysql2";

import pool from "db/db.config";

export type TKey = { key: string; sign?: string };
export type TOptions = { table: string; ignore?: boolean; keys?: Array<TKey>; suffix?: string; };

export const DB_SCHEMA = process.env.DB_SCHEMA || process.env.DB_DATABASE;

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
const modify = async (sql: string, args: Array<any>): Promise<ResultSetHeader> => {
  const [results] = await pool.execute(sql, args);
  return results as ResultSetHeader;
};

//+--------------------------------------------------------------------------------------+
//| Executes prepared DML statements on the database;                                    |
//+--------------------------------------------------------------------------------------+
const insert = async (sql: string, args: Array<any>): Promise<ResultSetHeader> => {
  const [results] = await pool.query(sql, args);
  return results as ResultSetHeader;
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
      const { sign } = keys?.find((search) => search.key === obj) || { sign: `=` };
      key.push(`${obj} ${sign} ?`);
      value.push(Object.values(props)[id]);
    }
  });
  return [key, value];
};

//+--------------------------------------------------------------------------------------+
//| Returns columns and keys in separate arrays;                                         |
//+--------------------------------------------------------------------------------------+
export const splitKeys = <T>(props: Partial<T>, filter: Array<string>) => {
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
//| Parses, prepares, and executes Insert statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Insert = async <T>(props: Partial<T>, options: TOptions) => {
  const { table, ignore } = options;
  const [fields, args] = parseColumns(props, "");
  const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")})`;

  try {
    await modify(sql, args);
    return props;
  } catch (e) {
    console.log({ sql, args, props });
    console.log(e);
    return [] as T;
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Select statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Select = async <T>(props: Partial<T>, options: TOptions): Promise<Array<Partial<T>>> => {
  const { table, keys, suffix } = options;
  const [fields, args] = parseKeys(props, keys);
  const sql = `SELECT * FROM ${DB_SCHEMA}.${table}${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""} ${suffix ? suffix : ``}`;

  try {
    const result = await select<T>(sql, args);
    return result.length ? result : [];
  } catch (e) {
    console.log(e);
    return [];
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Update statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Update = async <T>(props: Partial<T>, options: TOptions) => {
  const [columns, filters] = splitKeys<T>(props, options.keys ? options.keys.map((k) => k.key) : []);
  if (Object.keys(columns).length) {
    const { table } = options;
    const [fields, values] = parseColumns(columns);
    const [keys, args] = parseKeys(filters);
    const sql = `UPDATE ${DB_SCHEMA}.${table} SET ${fields.join(", ")}${fields.length ? " WHERE ".concat(keys.join(" AND ")) : ""}`;

    try {
      const result = await modify(sql, [...values, ...args]);
      return result ? [filters as Partial<T>, columns as Partial<T>] : [undefined, undefined];
    } catch (e) {
      console.log({ sql, args, props });
      console.log(e);
      return [undefined, undefined];
    }
  } else return [undefined, undefined];
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes Update statements;                                    |
//+--------------------------------------------------------------------------------------+
export const Distinct = async <T>(props: Partial<T>, options: TOptions) => {
  const [columns, filters] = splitKeys<T>(props, options.keys ? options.keys.map((k) => k.key) : []);
  const { table } = options;
  const fields = Object.keys(props).join(", ");
  const [keys, args] = parseKeys(filters);
  const sql = `SELECT DISTINCT ${fields} FROM ${DB_SCHEMA}.${table}${keys.length ? " WHERE ".concat(keys.join(" AND ")) : ""}`;

  try {
    const result = await select(sql, args);
    return result.length ? result : [];
  } catch (e) {
    console.log({ sql, args, props });
    console.log(e);
    return [];
  }
};

//+--------------------------------------------------------------------------------------+
//| Parses, prepares, and executes bulk load statements;                                 |
//+--------------------------------------------------------------------------------------+
export const Load = async <T>(props: Array<Partial<T>>, options: TOptions) => {
  if (props.length) {
    const { table, ignore } = options;

    const args = props.map((obj) => Object.values(obj));
    const fields = Object.keys(props[0]);
    const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES ?`;

    try {
      const results = await insert(sql, [args]);
      return results.affectedRows;
    } catch (e) {
      console.log({ sql, args, props });
      console.log(e);
      return 0;
    }
  }
  return props.length;
};
