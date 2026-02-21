/**
 * @file api/types.ts
 * @description Core Type definitions for API and DML operations.
 */

import type { TPrimaryKey } from "#db";

/**
 * Standard API Response package
 */
export interface IApiEnvelope<T> {
  code: string | number;
  msg: string;
  data: T;
}

/**
 * Standard Database Response
 */
export type TResponse = {
  success: boolean;
  code: number | string;
  state: string;
  message: string;
  rows: number;
  context: string;
};

/**
 * The Standardized Publish Wrapper
 */
export interface IPublishResult<T> {
  key?: TPrimaryKey<T> | undefined;
  response: TResponse;
}
