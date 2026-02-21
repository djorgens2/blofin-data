/**
 * query.utils.ts
 * (c) 2018, Dennis Jorgenson
 */
"use strict";

import type { ResultSetHeader, PoolConnection } from "mysql2/promise";
import type { TOptions, TPrimaryKey, TKey } from "#db";
import type { TResponse } from "#api";

import { hasValues } from "#lib/std.util";
import { Log } from "#module/session";

import { ApiResult } from "#api";
import { pool, DB_SCHEMA } from "#db";

/**
 * Generates a structured primary key object for database operations.
 * 
 * Extracts specified keys from a source object to build a formatted 
 * `TPrimaryKey`. This supports both simple and composite keys, ensuring
 * that only defined properties are included in the final response.
 *
 * @template T - The type of the source object.
 * @param obj  - The source data object containing potential key values.
 * @param keys - An array of property names that constitute the primary key.
 * @returns TPrimaryKey<T> - A partial object containing only the specified 
 *          primary key attributes present in the source object.
 * @example
 * // For a composite key of account_id and currency_code
 * const pkey = PrimaryKey(accountObj, ['account_id', 'currency_code']);
 */
export const PrimaryKey = <T>(obj: T, keys: (keyof T)[]): TPrimaryKey<T> => {
  const cpk: TPrimaryKey<T> = {};
  keys.forEach((key) => {
    if (obj[key] !== undefined) {
      cpk[key] = obj[key] as any;
    }
  });
  return cpk;
};

/**
 * Normalizes caught exceptions into a canonical TResponse object.
 *
 * @param any e - The raw error object caught from the database driver.
 * @param any[] args - The arguments used in the query for logging context.
 * @param string context - The calling module context.
 * @returns TResponse - A standardized failure response.
 */
const normalizeError = (e: any, args: Array<any>, context: string): TResponse => {
  Log().errors && console.log(`-> [Error] ${e?.errno || e?.code}: ${e?.message}`, { sql: e?.sql, args });

  return ApiResult(false, context, {
    code: e?.errno || e?.code || -1,
    state: "Rejected", // Use your FCRT state
    message: `-> [Error] ${context}: ${e?.message || "An unknown database error occurred"}`,
    rows: 0,
  });
};

/**
 * Executes prepared SELECT queries and returns a typed data payload.
 *
 * @template T - The interface representing the expected row structure.
 * @param string sql - The SQL query string with placeholders.
 * @param any[] args - Values to bind to the SQL placeholders.
 * @param string context - Identifier for logging and error tracing (e.g., 'Orders.Fetch').
 * @returns Promise<TResponse & { data?: T[] }> - Canonical response with a 'data' array of type T.
 */
const select = async <T>(sql: string, args: Array<any>, context: string): Promise<TResponse & { data?: T[] }> => {
  try {
    const [results] = await pool.execute(sql, args);
    const rows = results as T[];

    return ApiResult<T[]>(true, context, {
      data: rows,
      state: "Complete",
    });
  } catch (e) {
    return normalizeError(e, args, context);
  }
};

/**
 * Executes DML operations (UPDATE/DELETE) and reports on affected rows.
 *
 * @param {string} sql - The SQL command string.
 * @param {any[]} args - Values to bind to the SQL placeholders.
 * @param {string} context - Traceable context for the operation.
 * @returns {Promise<TResponse>} Standard response indicating success if rows were modified.
 */
const modify = async (sql: string, args: Array<any>, context: string): Promise<TResponse> => {
  try {
    const [results] = await pool.execute(sql, args);
    const affectedRows = (results as ResultSetHeader).affectedRows ?? 0;

    return ApiResult(affectedRows > 0, context, {
      code: affectedRows > 0 ? 0 : 404,
      state: affectedRows > 0 ? "Complete" : "Not Found",
      message: affectedRows > 0 ? `-> [Info] ${context}: DML operation successful` : `-> [Warning] ${context}: No rows affected`,
      rows: affectedRows,
    });
  } catch (e) {
    return normalizeError(e, args, context);
  }
};

/**
 * Executes INSERT operations and returns the result status.
 *
 * @param string sql - The SQL Insert string.
 * @param any[] args - Values to bind to the SQL placeholders.
 * @param string context - Traceable context for the operation.
 * @returns Promise<TResponse> - Standard response indicating success if the row was created.
 */
const insert = async (sql: string, args: Array<any>, context: string): Promise<TResponse> => {
  try {
    const [results] = await pool.query(sql, args);
    const affectedRows = (results as ResultSetHeader).affectedRows ?? 0;

    return ApiResult(affectedRows > 0, context, {
      code: affectedRows > 0 ? 0 : 404,
      state: affectedRows > 0 ? "Complete" : "Not Found",
      message: affectedRows > 0 ? `-> [Info] ${context}: Insert operation successful` : `-> [Warning] ${context}: No rows affected`,
      rows: affectedRows,
    });
  } catch (e) {
    return normalizeError(e, args, context);
  }
};

/**
 * Executes a query within an existing database transaction.
 *
 * @param string sql - The SQL command string.
 * @param any[] args - Values to bind to the SQL placeholders.
 * @param string context - Traceable context for the operation.
 * @param PoolConnection connection - The active transaction connection to use.
 * @returns Promise<TResponse> - Standard response scoped to the current transaction.
 */
const transact = async (sql: string, args: Array<any>, context: string, connection: PoolConnection): Promise<TResponse> => {
  try {
    const [results] = await connection.execute(sql, args);
    const affectedRows = (results as ResultSetHeader).affectedRows ?? 0;

    return ApiResult(affectedRows > 0, context, {
      code: affectedRows > 0 ? 0 : 404,
      state: affectedRows > 0 ? "Complete" : "Not Found",
      message: affectedRows > 0 ? `-> [Info] ${context}: Transaction successful` : `-> [Warning] ${context}: Transaction affected no rows`,
      rows: affectedRows,
    });
  } catch (e) {
    return normalizeError(e, args, context);
  }
};

/**
 * Prepares the SET segment of an UPDATE query.
 *
 * @template T - The interface model being processed.
 * @param columns - The data object containing values to be updated.
 * @returns - A tuple containing [fieldStrings[], values[]].
 */
const parseColumns = <T extends object>(columns: Partial<T>, delimiter = " = ?") => {
  const fields: string[] = [];
  const values: any[] = [];
  const defined: Partial<T> = {};

  for (const [key, val] of Object.entries(columns) as Array<[keyof T, any]>) {
    if (val !== undefined) {
      fields.push(`${String(key)}${delimiter}`);
      values.push(val);
      defined[key] = val;
    }
  }
  return [fields, values, defined] as [string[], any[], Partial<T>];
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

/**
 * Dynamically builds and executes an INSERT statement.
 *
 * @template T - The interface matching the table schema.
 * @param Partial<T> props - The data object to insert.
 * @param TOptions<T> options - Configuration including table name and 'ignore' flags.
 * @param string [context='Query.Utils'] - Path for error tracing.
 * @returns Promise<TResponse> - Success status and affected row count.
 */
export const Insert = async <T>(props: Partial<T>, options: TOptions<T>, context = `Query.Utils`): Promise<TResponse> => {
  context = `${context}.Insert`;

  if (!hasValues<Partial<T>>(props)) {
    return ApiResult(false, context, { code: 400, message: `-> [Warning] ${context}: No data on Insert` });
  }
  const { table, ignore } = options;
  const [fields, args, defined] = parseColumns(props, "");
  const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")})`;

  try {
    const result = options.connection ? await transact(sql, args, context, options.connection) : await modify(sql, args, context);
    const responseMsg = result.rows ? `inserted` : ignore ? `exists` : `error`;
    const code = ignore && result.rows === 0 ? 200 : result.code;

    Log().insert && result.rows && console.log(`-> [Info] ${table} inserted`, { columns: defined });

    return ApiResult(!!result.rows, context, { code, message: responseMsg, rows: result.rows });
  } catch (e) {
    return normalizeError(e, args, context);
  }
};

/**
 * Dynamically builds an UPDATE statement based on provided keys and properties.
 * Separates filter keys from data columns using splitKeys.
 *
 * @template T - The interface matching the table schema.
 * @param Partial<T> props - Object containing both new values and filter keys.
 * @param TOptions<T> options - Configuration identifying which properties are primary keys.
 * @param string [context='Query.Utils'] - Path for error tracing.
 * @returns Promise<TResponse> - Success status (fails if no rows match or no columns changed).
 */
export const Update = async <T extends object>(props: Partial<T>, options: TOptions<T>, context = `Query.Utils`): Promise<TResponse> => {
  context = `${context}.Update`;

  if (!hasValues<Partial<T>>(props)) {
    return ApiResult(false, context, { code: 400, message: `null_query` });
  }

  const { table, suffix, limit, keys: keyDefinitions } = options;
  const filterKeyNames = keyDefinitions?.map(([name]) => name as string) || [];
  const [columns, filters] = splitKeys<T>(props, filterKeyNames);
  const [keys, args] = parseKeys<T>(filters, keyDefinitions);
  const [fields, values, defined] = parseColumns<T>(columns);

  if (fields.length === 0) {
    return ApiResult(false, context, { code: 400, message: `no_update` });
  }

  const sql = `UPDATE ${DB_SCHEMA}.${table} SET ${fields.join(", ")}${
    keys.length ? " WHERE " + keys.join(" AND ") : ""
  } ${suffix ?? ""}${limit ? ` LIMIT ${limit}` : ""}`;

  try {
    const result = await modify(sql, [...values, ...args], context);
    const responseMsg = result.rows ? `updated` : result.code ? `error` : `not_found`;
    const code = result.rows ? result.code : result.code ? result.code : 404;

    Log().update && result.rows && console.log(responseMsg, `-> [Info] ${table} updated`, { filters, columns: defined });

    return ApiResult(!!result.rows, context, { code, message: responseMsg, rows: result.rows });
  } catch (e) {
    return normalizeError(e, [...values, ...args], context);
  }
};

/**
 * Executes a SELECT * query with dynamic WHERE clauses generated from props.
 *
 * @template T - The interface representing the expected result row.
 * @param Partial<T> props - The filter criteria (mapped to WHERE clauses).
 * @param TOptions<T> options - Configuration for table name, limits, and custom suffixes.
 * @param string [context='Query.Utils'] - Path for error tracing.
 * @returns Promise<TResponse & { data?: T[] }> - Response containing the found rows in 'data'.
 */
export const Select = async <T extends object>(props: Partial<T>, options: TOptions<T>, context = `Query.Utils`): Promise<TResponse & { data?: T[] }> => {
  context = `${context}.Select`;

  const { table, keys, suffix, limit } = options;
  const [fields, args] = parseKeys(props, keys);
  const sql = `SELECT * FROM ${DB_SCHEMA}.${table}${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""} ${suffix ? suffix : ``}${
    limit ? `LIMIT ${limit}` : ``
  }`;

  try {
    Log().select && console.log(`-> [Info] Executing Select on ${DB_SCHEMA}.${table}`, { sql, fields, args });

    return await select<T>(sql, args, context);
  } catch (e) {
    return normalizeError(e, args, context);
  }
};

/**
 * Performs a SELECT DISTINCT query on specific columns while filtering by others.
 *
 * @template T - The interface matching the table schema.
 * @param Partial<T> props - Object containing columns to SELECT (distinct) and filter values.
 * @param TOptions<T> options - Configuration defining the keys used for filtering.
 * @param string [context='Query.Utils'] - Path for error tracing.
 * @returns Promise<TResponse & { data?: T[] }> - Unique rows matching the criteria.
 */
export const Distinct = async <T extends object>(props: Partial<T>, options: TOptions<T>, context = `Query.Utils`): Promise<TResponse & { data?: T[] }> => {
  context = `${context}.Distinct`;

  if (!hasValues<Partial<T>>(props)) {
    return ApiResult(false, context, { code: 400, message: `null_query` });
  }

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
    return await select(sql, args, context);
  } catch (e) {
    console.error(`-> [Error] Distinct failed on ${table}`, e);
    return normalizeError(e, args, context);
  }
};

/**
 * Performs a high-performance bulk insert using a nested array of values.
 *
 * @template T - The interface matching the table schema.
 * @param Array<Partial<T>> props - Array of objects to be bulk-loaded.
 * @param TOptions<T> options - Configuration for table name and 'ignore' logic.
 * @param string [context='Query.Utils'] - Path for error tracing.
 * @returns Promise<TResponse> - Summary of the bulk operation.
 */
export const Load = async <T>(props: Array<Partial<T>>, options: TOptions<T>, context = "Query.Utils"): Promise<TResponse> => {
  context = `${context}.Load`;
  if (!props?.length) {
    return ApiResult(false, context, { code: 400, message: `null_query` });
  }

  const { table, ignore } = options;
  const args = props.map((obj) => Object.values(obj));
  const fields = Object.keys(props[0]);
  const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES ?`;

  try {
    return await insert(sql, [args], context);
  } catch (e) {
    return normalizeError(e, args, context);
  }
};
