//+--------------------------------------------------------------------------------------+
//|                                                                  [api]  leverages.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition, TPosition } from "db/interfaces/instrument_position";
import type { IPublishResult } from "api";

import { hasValues } from "lib/std.util";
import { API_GET, API_POST, ApiError } from "api";

import * as InstrumentPosition from "db/interfaces/instrument_position";

export interface ILeverageAPI {
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: TPosition;
  leverage: string;
}

//+--------------------------------------------------------------------------------------+
//| Updates leverage locally on success;                                                 |
//+--------------------------------------------------------------------------------------+
const publish = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  if (!hasValues(props) || !props.instId || !props.positionSide || !props.leverage) {
    return {
      key: undefined,
      response: { success: false, code: 400, response: `null_query`, message: `Undefined leverage data provided`, rows: 0, context: "Leverage.Publish.API" },
    };
  }
  console.log("-> Leverage.Publish.API");
  return await InstrumentPosition.Publish({ symbol: props.instId, position: props.positionSide, leverage: parseInt(props.leverage) });
};

/**
 * Sets Leverage for a trading instrument position
 */
export const Submit = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  console.log("-> Leverage.Submit.API:", props);

  const path = "/api/v1/account/set-leverage";
  const context = "Leverage.Submit";

  try {
    const data = await API_POST<ILeverageAPI>(path, props, context);
    return await publish(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        key: undefined,
        response: {
          success: false,
          code: error.code,
          response: `error`,
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
        response: "error",
        message: error instanceof ApiError ? error.message : "Network or System failure",
        rows: 0,
        context,
      },
    };
  }
};

/**
 * Imports batch leverage information for the provided instrument positions
 */
export const Import = async (props: Array<Partial<IInstrumentPosition>>): Promise<Array<ILeverageAPI>> => {
  if (!hasValues(props)) return [];
  console.log("-> Leverage.Submit [API]");

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
