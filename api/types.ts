/**
 * @file api/types.ts
 * @description Core Type definitions for API and DML operations.
 */

import type {  PoolConnection  } from "mysql2/promise"; // If needed for TOptions

/**
 * Standard Database Response
 */
export type TResponse = {
  success: boolean;
  response: string;
  code: number;
  rows: number;
  context: string;
  outcome?: string;
  message?: string;
};

/**
 * The "Pristine" Tuple: [ColumnName, SQLOperator?]
 */
export type TKey<T> = [keyof T, string?];

/**
 * DML Options with Generic Type Safety
 */
export type TOptions<T> = { 
  table?: string; 
  ignore?: boolean; 
  keys?: Array<TKey<T>>; 
  limit?: number; 
  suffix?: string; 
  connection?: PoolConnection;
  context?: string;
};

/**
 * The Standardized Publish Wrapper
 */
export interface IPublishResult<T> {
  key?: TPrimaryKey<T> | undefined; // Or your PrimaryKey return type
  response: TResponse;
}

//export type CompositeKey<T> = { [K in keyof T]?: T[K] };
export type TPrimaryKey<T> = Partial<T>;

