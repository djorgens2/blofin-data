//+---------------------------------------------------------------------------------------------+
//|                                                                                   loader.ts |
//|                                                            Copyright 2018, Dennis Jorgenson |
//|                                                                                             |
//| Usage:                                                                                      |
//|    Now: npx tsx ./app/loader ENA-USDT 15m > ./log/ENA-USDT-loader.log                       |
//|    Set: npx tsx ./app/loader ENA-USDT 15m 1731485700000 > ./log/ENA-USDT-loader-fix.log     |
//+---------------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "#lib/app.util";

import { clear } from "#lib/app.util";
import { Session } from "#module/session";
import { Candles } from "#api";

//+---------------------------------------------------------------------------------------------+
//| Loads candle data locally for supplied symbol/timeframe from start_time and earlier;        |
//+---------------------------------------------------------------------------------------------+
const symbol = process.argv[2] || "ERROR";
const timeframe = process.argv[3] || "15m";
const start_time = process.argv[4] ? parseInt(process.argv[4]) : new Date().getTime();

if (Session().account) {
  const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });

  console.log("In App.Loader for ", { symbol, timeframe, start_time }, "start: ", new Date().toLocaleString());

  Candles.Import(message, { symbol, timeframe, startTime: start_time }).then((res) => {
    console.log(`-> Import for ${res?.symbol} complete:`, new Date().toLocaleString());
    res?.db && res.db.insert && console.log(`  # [Info] ${message.symbol}: ${res.db.insert} candles imported`);
    res?.db && res.db.update && console.log(`  # [Info] ${message.symbol}: ${res.db.update} candles updated`);
  });
}
