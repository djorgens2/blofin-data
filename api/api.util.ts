/**
 * api.util.ts
 *
 * Copyright 2018, Dennis Jorgenson
 */
"use strict";

import { Session, signRequest } from "module/session";

/**
 * ApiError
 *
 * Formats and handles errors received from an api call;
 */
export class ApiError extends Error {
  public readonly code: number;
  public readonly msg: string;

  constructor(code: number, msg: string) {
    super(`[API] Code ${code}: ${msg}`);

    this.name = "ApiError";
    this.code = code;
    this.msg = msg;

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
      console.log('[Error]', result);
      throw new ApiError(result.code, result.msg );
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
