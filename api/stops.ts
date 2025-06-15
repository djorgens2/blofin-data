//+--------------------------------------------------------------------------------------+
//|                                                                             stops.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import { isEqual } from "@lib/std.util";
import { Session, signRequest } from "@module/session";

export interface IStopsAPI {
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

export interface IStopRequest {
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  type: 'tp' | 'sl';
  position: 'long' | 'net' | 'stop';
  size: number;
  price: number;
  size_percent: number;
  symbol_percent: number;
  equity_percent: number;
  create_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Updates active stops from the blofin api;                                            |
//+--------------------------------------------------------------------------------------+
export async function Update(props: IStopsAPI) {
  // do something
}

//+--------------------------------------------------------------------------------------+
//| Import - retrieves active orders; reconciles with local db;                          |
//+--------------------------------------------------------------------------------------+
export async function Import() {
  const method = "GET";
  const path = "/api/v1/trade/orders-tpsl-pending";
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
      if (json?.code === 0) throw new Error(json);
//      Publish(json.data);

    })
    .catch((error) => console.log(error));
}
