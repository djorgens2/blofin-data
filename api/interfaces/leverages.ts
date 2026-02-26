/**
 * API Integration for Account Leverage Management.
 * 
 * Provides methods to submit leverage changes to the exchange and import
 * current leverage settings for multiple instruments in bulk.
 * 
 * @module api/leverages
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IInstrumentPosition } from "#db";
import type { IPublishResult } from "#api";
import { API_GET, API_POST, ApiError } from "#api";
import { hasValues } from "#lib/std.util";
import { InstrumentPosition } from "#db";

/**
 * Leverage data structure as defined by the Broker/Exchange API.
 */
export interface ILeverageAPI {
  /** The trading symbol (e.g., "BTC-USDT-PERP"). */
  instId: string;
  /** Margin calculation logic. */
  marginMode: "cross" | "isolated";
  /** Position direction the leverage applies to. */
  positionSide: `long` | `short` | `net`;
  /** Leverage multiplier as a string. */
  leverage: string;
}

// --- Private Functions ---

/**
 * Internal helper to update the local database after a successful API response.
 * 
 * @param props - Validated leverage data from the API.
 * @returns A promise resolving to the local DB publication result.
 */
const publish = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  if (!hasValues(props) || !props.instId || !props.positionSide || !props.leverage) {
    return {
      key: undefined,
      response: { 
        success: false, 
        code: 400, 
        state: `null_query`, 
        message: `Undefined leverage data provided`, 
        rows: 0, 
        context: "Leverage.Publish.API" 
      },
    };
  }
  
  return await InstrumentPosition.Publish({ 
    symbol: props.instId, 
    position: props.positionSide, 
    leverage: parseInt(props.leverage) 
  });
};

// --- Public Functions ---

/**
 * Submits a leverage change request to the exchange for a specific instrument.
 * 
 * @param props - Desired leverage settings (instId, marginMode, leverage, etc).
 * @returns The result of the API call and subsequent local DB update.
 */
export const Submit = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  const path = "/api/v1/account/set-leverage";
  const context = "Leverage.Submit";

  try {
    const result = await API_POST<ILeverageAPI>(path, props, context);
    return await publish(result.data!);
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        key: undefined,
        response: {
          success: false,
          code: error.code,
          state: `error`,
          message: error.msg,
          rows: 0,
          context,
        },
      };
    }

    console.error(`-> [System Error] ${context}:`, error);
    return {
      key: undefined,
      response: {
        success: false,
        code: error instanceof ApiError ? error.code : -1,
        state: "error",
        message: error instanceof ApiError ? error.message : "Network or System failure",
        rows: 0,
        context,
      },
    };
  }
};

/**
 * Retrieves current leverage settings for a batch of instruments from the exchange.
 * 
 * @param props - Array of position objects containing the symbols to query.
 * @returns A promise resolving to an array of leverage settings from the API.
 */
export const Import = async (props: Array<Partial<IInstrumentPosition>>): Promise<Array<ILeverageAPI>> => {
  if (!hasValues(props)) return [];

  const { margin_mode } = props[0];
  const symbols = props.map((i) => i.symbol).join(",");
  const path = `/api/v1/account/batch-leverage-info?instId=${symbols}&marginMode=${margin_mode}`;
  const context = "Leverage.Import";

  try {
    const data = await API_GET<Array<ILeverageAPI>>(path, context);

    if (!Array.isArray(data)) {
      throw new ApiError(422, "Malformed Leverage data: Expected an array.");
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`-> [API Error] ${context}:`, error.msg);
    } else {
      console.error(`-> [System Error] ${context}:`, error);
    }

    return [];
  }
};
