/**
 * @file api.util.ts
 * @summary Unified Exchange API & Envelope Factory
 *
 * @copyright 2018-2026, Dennis Jorgenson
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
 * Executes a signed POST request to the exchange.
 *
 * @template T - Expected shape of the 'data' payload.
 * @param path - The API endpoint.
 * @param body - The payload to be stringified and sent.
 * @param context - Traceable path for logs.
 * @returns {Promise<TResponse & { data?: T }>} Enveloped response.
 */
export const API_POST = async <T>(path: string, body: any, context: string): Promise<TResponse & { data?: T }> => {
  const { api, phrase, rest_api_url, secret, config } = Session();

  if (!api || !phrase || !rest_api_url || !secret) {
    return ApiResult(false, context, { code: 401, message: "Missing Credentials" });
  }

  try {
    const jsonBody = JSON.stringify(body);
    const { sign, timestamp, nonce } = await signRequest("POST", path, jsonBody);

    const response = await fetch(`${rest_api_url}${path}`, {
      method: "POST",
      headers: {
        "ACCESS-KEY": api,
        "ACCESS-SIGN": sign,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-NONCE": nonce,
        "ACCESS-PASSPHRASE": phrase,
        "Content-Type": "application/json",
      },
      body: jsonBody,
      signal: AbortSignal.timeout(config?.apiTimeoutTimeMs ?? 30000),
    });

    const result = await response.json();

    // Blofin API Success Check
    if (result.code !== "0") {
      return ApiResult(false, context, {
        code: result.code,
        message: result.msg,
        state: "Rejected",
      });
    }

    return ApiResult(true, context, {
      data: result.data as T,
      state: "Complete",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network/Timeout Error";
    return ApiResult(false, context, { code: "HTTP_ERR", message: msg });
  }
};

/**
 * Executes a signed GET request to the exchange.
 *
 * @template T - Expected shape of the 'data' payload.
 * @param path - The API endpoint (e.g., '/api/v1/account/balance').
 * @param context - Traceable path for logs.
 * @returns {Promise<TResponse & { data?: T }>} Enveloped response.
 */
export const API_GET = async <T>(path: string, context: string): Promise<TResponse & { data?: T }> => {
  const { api, phrase, rest_api_url, secret } = Session();

  if (!api || !phrase || !rest_api_url || !secret) {
    return ApiResult(false, context, { code: 401, message: "Missing Credentials" });
  }

  try {
    const { sign, timestamp, nonce } = await signRequest("GET", path);
    const response = await fetch(`${rest_api_url}${path}`, {
      method: "GET",
      headers: {
        "ACCESS-KEY": api,
        "ACCESS-SIGN": sign,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-NONCE": nonce,
        "ACCESS-PASSPHRASE": phrase,
      },
      // Native Node 22: Add a timeout signal from your DB config
      signal: AbortSignal.timeout(Session().config?.apiTimeoutTimeMs || 30000),
    });

    // SAFETY: Check if response is actually JSON before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return ApiResult(false, context, {
        code: response.status,
        message: `Exchange returned non-JSON response: ${response.statusText}`,
      });
    }

    const result = await response.json();

    // Blofin uses code "0" for success
    if (result.code !== "0") {
      return ApiResult(false, context, { code: result.code, message: result.msg, state: "Rejected" });
    }

    return ApiResult(true, context, { data: result.data as T, state: "Complete" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown Network Error";
    return ApiResult(false, context, { code: "HTTP_ERR", message: msg });
  }
};
