/**
 * @file api/types.ts
 * @description Core Type definitions for API and DML operations.
 */

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
