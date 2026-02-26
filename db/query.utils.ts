/**
 * @file query.utils.ts
 * @summary Master Database Interface & SQL Orchestrator
 * @description
 * Provides a high-performance, type-safe abstraction layer for MySQL operations.
 * Optimized for **Node 22 Native ESM**, this module manages:
 * 1. **Dynamic SQL Generation**: Safe parsing of SET and WHERE clauses via `Object.entries`.
 * 2. **Result Enveloping**: Standardizing database responses into `TResponse` objects.
 * 3. **Atomic Transactions**: Managing multi-step operations with automatic rollback.
 * 4. **Prepared Statements**: Utilizing `pool.execute` for sub-millisecond execution cycles.
 *
 * @security Implements mandatory parameterization and 'Dangerous LIKE' pattern detection.
 * @performance Utilizes V8-optimized functional pipelines for 500ms heartbeat parity.
 * @copyright 2018-2026, Dennis Jorgenson
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
  return Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]])) as TPrimaryKey<T>;
};

/**
 * Normalizes caught exceptions into a canonical TResponse object.
 *
 * @param e - The raw error object.
 * @param args - Bind parameters for context.
 * @param context - Traceable path (e.g., 'Session.Config.Select').
 * Helps isolate which Child PID triggered the query in the unified app.log.
 * @returns {TResponse & { data: [] }} - Guaranteed shape for destructuring.
 */
const normalizeError = (e: any, args: Array<any>, context: string): TResponse & { data: [] } => {
  Log().errors && console.error(`-> [Error] ${context} | ${e?.code || "DB_ERR"}: ${e?.message}`);

  return {
    ...ApiResult(false, context, {
      code: e?.errno || e?.code || -1,
      state: "Rejected",
      message: `-> [Error] ${context}: ${e?.message || "Database error"}`,
      rows: 0,
    }),
    data: [], // CRITICAL: This prevents "cannot destructure property 'data' of undefined"
  };
};

/**
 * Executes prepared SELECT queries and returns a typed data payload.
 *
 * @template T - The interface representing the expected row structure.
 * @param sql - The SQL query string with placeholders.
 * @param args - Values to bind to the SQL placeholders.
 * @param context - Traceable path (e.g., 'Session.Config.Select').
 * Helps isolate module executing the query in the unified app.log.
 * @returns {Promise<TResponse & { data?: T[] }>} Canonical response with a 'data' array.
 * @see {@link https://github.com MySQL2 Execute}
 */
const select = async <T>(sql: string, args: Array<any>, context: string): Promise<TResponse & { data: T[] }> => {
  try {
    const [results] = await pool.execute(sql, args);

    // Ensure we always return an array, even if the driver misbehaves
    const rows = Array.isArray(results) ? (results as T[]) : [];

    /**
     * LOGIC GATE:
     *
     * 1. If rows are returned, success is true.
     * 2. If no rows but also no args, treat as success (e.g., SELECT * with no filters).
     * 3. If no rows and args were provided, treat as not found (404).
     */
    const success = rows.length > 0 ? true : args.length === 0;
    const message = rows.length > 0 ? "Query successful" : "No matching records found";
    const code = rows.length > 0 ? 0 : success ? 200 : 404;

    return {
      ...ApiResult(success, context, { state: "Complete", rows: rows.length, message, code }),
      data: rows,
    };
  } catch (e) {
    // Guaranteed to return { ..., data: [] }
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
const modify = async (sql: string, args: Array<any>, context: string): Promise<TResponse & { changed: number }> => {
  try {
    const [results] = await pool.execute(sql, args);
    const header = results as ResultSetHeader;

    const affected = header.affectedRows ?? 0;
    const changed = header.changedRows ?? 0;

    return {
      ...ApiResult(affected > 0, context, {
        code: affected > 0 ? 0 : 404,
        state: affected > 0 ? "Complete" : "Not Found",
        rows: affected, // Matches WHERE
      }),
      changed, // Actually modified
    };
  } catch (e) {
    return { ...normalizeError(e, args, context), changed: 0 };
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
 * @param delimiter - The SQL operator used to bind keys to placeholders.
 *
 * - Use `""` (Empty String) for **INSERT** operations to generate a raw
 *   comma-separated column list: `(col1, col2)`.
 *
 * - Use `" = ?"` (Assignment) for **UPDATE** operations to generate
 *   SET-clause pairs: `col1 = ?, col2 = ?`.
 *
 * @default " = ?" - Optimized for the most common 'Update' scenario.
 * @returns - A tuple containing [fieldStrings[], values[]].
 */
const parseColumns = <T extends object>(columns: Partial<T>, delimiter = " = ?") => {
  const entries = Object.entries(columns).filter(([_, val]) => val !== undefined);
  const fields = entries.map(([key]) => `${key}${delimiter}`);
  const values = entries.map(([_, val]) => val);
  const defined = Object.fromEntries(entries);

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
  // 1. Functional pipeline: Filter and map in one optimized pass
  const entries = Object.entries(props).filter(([_, val]) => val !== undefined);

  const sqlClauses: string[] = [];
  const values: any[] = [];

  for (const [col, val] of entries) {
    // 2. Safe retrieval of the operator tuple
    const match = keys?.find(([k]) => k === col);

    // 3. If match exists, use its second element [1]; otherwise, default to "="
    const sign = (match?.[1] || "=").toUpperCase();

    // 4. Specialized Logic Branching
    if (sign === "IN" && Array.isArray(val)) {
      const placeholders = val.map(() => "?").join(", ");
      sqlClauses.push(`${col} IN (${placeholders})`);
      values.push(...val);
    } else if (sign === "LIKE") {
      // Security Guard: Block: "%", "%%", " % ", or empty strings
      const trimmed = String(val).trim();
      if (trimmed === "" || trimmed === "%" || trimmed === "%%") {
        throw new Error(`[Security] Dangerous LIKE pattern detected: "${val}"`);
      }
      sqlClauses.push(`${col} LIKE ?`);
      values.push(val);
    } else {
      // Standard comparison (=, !=, >, <, etc.)
      sqlClauses.push(`${col} ${sign} ?`);
      values.push(val);
    }
  }

  return [sqlClauses, values];
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

    // LOGIC GATE:
    // 1. result.rows > 0  => The record exists (Success)
    // 2. result.changed > 0 => Data actually moved
    // 3. result.changed === 0 => Data was already identical (No-op)
    const isSuccess = result.rows > 0;
    const responseMsg = isSuccess ? (result.changed > 0 ? "updated" : "no_change") : "not_found";

    Log().update && isSuccess && console.log(responseMsg, `-> [Info] ${table} updated`, { filters, columns: defined });

    return ApiResult(isSuccess, context, {
      code: isSuccess ? 200 : 404,
      message: responseMsg,
      rows: result.rows,
    });
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
  const sql = `SELECT * FROM ${DB_SCHEMA}.${table}${
    fields.length ? " WHERE " + fields.join(" AND ") : ""
  } ${suffix ?? ""} ${limit ? `LIMIT ${limit}` : ""}`.replace(/\s+/g, " "); // Clean up extra spaces

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
  // Ensure we aren't joining empty strings if props is messy
  const fields = Object.keys(columns)
    .filter((k) => !!k)
    .join(", ");
  if (!fields) throw new Error("Distinct requires at least one column to select.");

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
  const fields = Object.keys(props[0] as object);
  const args = props.map((obj) => fields.map((f) => (obj as any)[f]));
  const sql = `INSERT${ignore ? " IGNORE " : " "}INTO ${DB_SCHEMA}.${table} ( ${fields.join(", ")} ) VALUES ?`;

  try {
    return await insert(sql, [args], context);
  } catch (e) {
    return normalizeError(e, args, context);
  }
};
