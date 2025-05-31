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
export async function Update(props: IPositionsAPI) {
  const account = 0;
}
