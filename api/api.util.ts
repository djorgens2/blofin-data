/**
 * api.util.ts
 *
 * Copyright 2018, Dennis Jorgenson
 */
"use strict";

import type { TResponse } from "#api";
import { Session, signRequest } from "#module/session";

/**
 * Factory function to generate a canonical response object.
 * Standardizes the communication between API, Database, and State Machine modules
 * to prevent 'undefined' errors and ensure consistent outcome reporting.
 *
 * @template T - The type of the data payload (typically an object or array).
 * @param {boolean} success - Primary flag indicating if the operation met expectations.
 * @param {string} context - The module/function path (e.g., 'DB.Request.Update') for trace logging.
 * @param {Object} [overrides={}] - Optional properties to overwrite default values.
 * @param {number|string} [overrides.code] - Custom error or status code (defaults to 0 on success).
 * @param {string} [overrides.state] - The FCRT state (e.g., 'Pending', 'Rejected', 'Complete').
 * @param {string} [overrides.message] - Human-readable status message for logs and UI.
 * @param {number} [overrides.rows] - Number of affected records (auto-calculated if data is provided).
 * @param {T} [overrides.data] - The actual payload being transported.
 *
 * @returns {TResponse & { data?: T }} A standardized result object containing metadata and payload.
 *
 * @example
 * // Success Example
 * const res = ApiResult(true, 'API.Submit', { data: { id: '123' }, state: 'Pending' });
 *
 * @example
 * // Failure Example
 * const res = ApiResult(false, 'DB.Query', { message: 'Unique constraint failed', code: 'P2002' });
 */
export const ApiResult = <T>(success: boolean, context: string, overrides: Partial<TResponse> & { data?: T } = {}): TResponse & { data?: T } => ({
  success,
  code: overrides.code || (success ? 0 : "ERR_GENERIC"),
  state: overrides.state || (success ? "Success" : "Failed"),
  message: overrides.message || (success ? "Operation completed" : "Operation failed"),
  rows: overrides.rows ?? (overrides.data ? (Array.isArray(overrides.data) ? overrides.data.length : 1) : 0),
  context,
  data: overrides.data,
});

/**
 * Type guard to check if an error is an ApiError with a specific data payload
 */
export function isApiError<T>(error: unknown): error is ApiError<T> {
  return error instanceof ApiError;
}

/**
 * ApiError
 * T represents the type of the items INSIDE the data array.
 */
export class ApiError<T> extends Error {
  public readonly code: string | number;
  public readonly msg: string;
  public readonly data: T | undefined;

  constructor(code: string | number, msg: string, data?: T) {
    super(`[API] Code ${code}: ${msg}`);
    
    this.code = code;
    this.msg = msg;
    this.data = data;
    this.name = "ApiError";

    // Necessary for extending built-in classes in TS/ES5
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * API_POST
 *
 * API_POST: Handles signing and API POST calls
 */
export const API_POST = async <T>(path: string, data: unknown, context: string): Promise<T> => {
  const method = "POST";
  const body = JSON.stringify(data);
  const { api, phrase, rest_api_url } = Session();

  if (!api || !phrase || !rest_api_url) {
    throw new ApiError(401, `${context}: Incomplete Session: API credentials or URL missing.`);
  }

  try {
    const { sign, timestamp, nonce } = await signRequest(method, path, body);
    const response = await fetch(`${rest_api_url}${path}`, {
      method,
      headers: {
        "ACCESS-KEY": api,
        "ACCESS-SIGN": sign,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-NONCE": nonce,
        "ACCESS-PASSPHRASE": phrase,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) throw new ApiError(response.status, `HTTP ${response.status}: ${response.statusText}`);

    const result = await response.json();
    if (result.code !== "0") {
      console.log("[Error]", result);
      // result.data is inferred as T[] here
      throw new ApiError<T>(result.code, result.msg, result.data);
    }

    return result.data as T;
  } catch (error) {
    console.log(`-> [Error] ${context}:`, error instanceof ApiError ? error.message : error);
    throw error;
  }
};

/**
 * API_GET
 *
 * handles signing and API GET calls;
 */
export const API_GET = async <T>(path: string, context: string): Promise<T> => {
  const { api, phrase, rest_api_url } = Session();
  if (!api || !phrase || !rest_api_url) {
    throw new ApiError(401, `${context}: Incomplete Session: API credentials or URL missing.`);
  }

  try {
    const { sign, timestamp, nonce } = await signRequest("GET", path);
    const response = await fetch(`${rest_api_url}${path}`, {
      method: "GET",
      headers: {
        "ACCESS-KEY": api!,
        "ACCESS-SIGN": sign!,
        "ACCESS-TIMESTAMP": timestamp!,
        "ACCESS-NONCE": nonce!,
        "ACCESS-PASSPHRASE": phrase!,
      },
    });

    const result = await response.json();
    if (result.code !== "0") throw new ApiError(parseInt(result.code), result.msg);
    return result.data as T;
  } catch (error) {
    console.log(`-> [Error] ${context}:`, error instanceof ApiError ? error.message : error);
    throw error;
  }
};
