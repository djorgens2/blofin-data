//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  leverage.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition, TPosition } from "db/interfaces/instrument_position";

import { Session, signRequest } from "module/session";
import { hasValues } from "lib/std.util";

import * as Response from "api/response";

export interface ILeverageAPI {
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: TPosition;
  leverage: string;
}

export interface IResult {
  code: string;
  msg: string;
  data: Array<ILeverageAPI>;
}

//+--------------------------------------------------------------------------------------+
//| Retrieves leverages by symbol (max:20) from broker api for currently logged account; |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Array<Partial<IInstrumentPosition>>) => {
  if (hasValues(props)) {
    console.log("-> Leverage.Fetch [API]");

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
        const json = await response.json();
        return await Response.Leverage(json);
      } else throw new Error(`-> [Error] Instrument.Leverage: Response not ok: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log("-> [Error] Instrument.Leverage:", error, method, path, headers);
      return [];
    }
  }
};

//+--------------------------------------------------------------------------------------+
//| Sets Leverage for a trading instrument;                                              |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<ILeverageAPI>) => {
  console.log("-> Leverage.Publish [API]");

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
    if (response.ok) {
      const json = await response.json();
      return await Response.Leverage(json);
    } else throw new Error(`[Error] Leverage.Publish: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log("-> [Error] Leverage.Publish:", error, method, headers, body);
  }
};
