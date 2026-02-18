/**
 * db/types.ts
 * (c) 2018, Dennis Jorgenson
 */
"use strict"

import type { PoolConnection } from "mysql2/promise";
import type { TResponse } from "api";

/**
 * TKey represents a [column, operator] pair.
 * Example: ['price', '>='] or ['status', '=']
 */
export type TKey<T> = [keyof T, string?];

/**
 * Query builder tuple: [ColumnName, SQLOperator?]
 * DML Options with Generic Type Safety
 */
export type TOptions<T> = {
  table?: string;
  ignore?: boolean;
  keys?: Array<TKey<T>>;
  limit?: number;
  suffix?: string;
  context?: string;
  connection?: PoolConnection;
};

/**
 * Type guard for Primary Key publishing
 */
export type TPrimaryKey<T> = Partial<T>;

/**
 * The Standardized Publish Wrapper
 */
export interface IPublishResult<T> {
  key?: TPrimaryKey<T> | undefined;
  response: TResponse;
}
