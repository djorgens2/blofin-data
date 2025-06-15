//+--------------------------------------------------------------------------------------+
//|                                                                         positions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { ICandle, IKeyProps } from "@db/interfaces/candle";
import type { IMessage } from "@lib/app.util";

import { isEqual } from "@lib/std.util";

import * as Candle from "@db/interfaces/candle";
import { Session, signRequest } from "@module/session";

export interface IPositionsAPI {
  data: [
    {
      instType: string;
      instId: string;
      marginMode: string;
      positionId: number;
      positionSide: string;
      positions: number;
      availablePositions: number;
      averagePrice: number;
      unrealizedPnl: number;
      unrealizedPnlRatio: number;
      leverage: number;
      liquidationPrice: number;
      markPrice: number;
      initialMargin: number;
      margin: number;
      marginRatio: number;
      maintenanceMargin: number;
      adl: number;
      createTime: number;
      updateTime: number;
    }
  ];
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: IPositionsAPI) {
//  const stops = await tpsl.Import();
//  console.log({positions:props});

}

//+--------------------------------------------------------------------------------------+
//| Import - retrieves active orders; reconciles with local db;                          |
//+--------------------------------------------------------------------------------------+
export async function Import() {
  const method = "GET";
  const path = "/api/v1/account/positions";
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

  fetch(rest_api_url!.concat(path), {
    method,
    headers,
  })
    .then((response) => response.json())
    .then((json) => {
      if (json?.code > 0) throw new Error(json);
      Publish(json.data);
    })
    .catch((error) => console.log(error));
}
