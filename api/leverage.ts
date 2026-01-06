//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  leverage.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition, TPosition } from "db/interfaces/instrument_position";
import type { IPublishResult } from "db/query.utils";

import { PrimaryKey } from "db/query.utils";
import { Session, signRequest } from "module/session";
import { hasValues } from "lib/std.util";

import * as InstrumentPosition from "db/interfaces/instrument_position";
import { ApiError } from "./api.util";

export interface ILeverageAPI {
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: TPosition;
  leverage: string;
}

interface IResult {
  code: string;
  msg: string;
  data: Array<ILeverageAPI>;
}

//+--------------------------------------------------------------------------------------+
//| Updates leverage locally on success;                                                 |
//+--------------------------------------------------------------------------------------+
const publish = async (props: IResult): Promise<IPublishResult<IInstrumentPosition>> => {
  if (!!parseInt(props.code)) {
    return {
      key: undefined,
      response: { success: false, code: parseInt(props.code), state: `error`, message: props.msg, rows: 0 },
    };
  }

  const revised = Array.isArray(props.data) ? props.data[0] : props.data;

  return await InstrumentPosition.Publish({ symbol: revised.instId, position: revised.positionSide, leverage: parseInt(revised.leverage) });
};

//+--------------------------------------------------------------------------------------+
//| Sets Leverage for a trading instrument;                                              |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  console.log("-> Leverage.Submit [API]");

  const method = "POST";
  const path = "/api/v1/account/set-leverage";
  const body = JSON.stringify(props);
  const { api, phrase, rest_api_url } = Session();
  const { sign, timestamp, nonce } = await signRequest(method, path, body);

  const headers = {
    "ACCESS-KEY": api!,
    "ACCESS-SIGN": sign!,
    "ACCESS-TIMESTAMP": timestamp!,
    "ACCESS-NONCE": nonce!,
    "ACCESS-PASSPHRASE": phrase!,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(rest_api_url!.concat(path), {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      throw new ApiError(response.status, `HTTP ${response.statusText}`);
    }

    const result = await response.json();

    if (result.code !== "0") throw new ApiError(parseInt(result.code), result.msg);

    return publish(result.data);
  } catch (error) {
    if (error instanceof ApiError) {
      console.log("-> [Error] Leverage.Publish:", error, method, headers, body);
      return {
        key: undefined,
        response: { success: false, code: error.code, state: `error`, message: error.message, rows: 0 },
      };
    }
    console.error("-> [System Error] Leverage.Publish:", error);
    return {
      key: undefined,
      response: { success: false, code: -1, state: "error", message: "Network or System failure", rows: 0 },
    };
  }
};

//+--------------------------------------------------------------------------------------+
//| Retrieves leverages by symbol (max:20) from broker api for currently logged account; |
//+--------------------------------------------------------------------------------------+
export const Import = async (props: Array<Partial<IInstrumentPosition>>) => {
  if (hasValues(props)) {
    const { margin_mode } = props[0];
    const method = "GET";
    const path = `/api/v1/account/batch-leverage-info?instId=${props.map((i) => i.symbol).join(",")}&marginMode=${margin_mode}`;
    const { api, phrase, rest_api_url } = Session();
    const { sign, timestamp, nonce } = await signRequest(method, path);
    const headers = {
      "ACCESS-KEY": api!,
      "ACCESS-SIGN": sign!,
      "ACCESS-TIMESTAMP": timestamp!,
      "ACCESS-NONCE": nonce!,
      "ACCESS-PASSPHRASE": phrase!,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(rest_api_url!.concat(path), {
        method,
        headers,
      });

      if (response.ok) {
        const result: IResult = await response.json();
        const json = result.data;

        if (result.code === "0" && Array.isArray(json)) {
          return json as Array<ILeverageAPI>;
        } else throw new Error(`-> [Error] Instrument.Leverage: Malformed Leverage data received: ${response.status} ${response.statusText}`);
      } else throw new Error(`-> [Error] Instrument.Leverage: Response not ok: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log("-> [Error] Instrument.Leverage:", error, method, path, headers);
      return [];
    }
  }
};
