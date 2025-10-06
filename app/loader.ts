//+---------------------------------------------------------------------------------------------+
//|                                                                                   loader.ts |
//|                                                            Copyright 2018, Dennis Jorgenson |
//|                                                                                             |
//| Usage:                                                                                      |
//|    Now: npx tsx ./app/loader ENA-USDT 15m > ./log/ENA-USDT-loader.log                       |
//|    Set: npx tsx ./app/loader ENA-USDT 15m 1731485700000 > ./log/ENA-USDT-loader-fix.log     |
//+---------------------------------------------------------------------------------------------+
"use strict";

import * as Candles from "api/candles";

//+---------------------------------------------------------------------------------------------+
//| Loads candle data locally for supplied symbol/timeframe from start_time and earlier;        |
//+---------------------------------------------------------------------------------------------+
const symbol = process.argv[2] || "BTC-USDT";
const timeframe = process.argv[3] || "15m";
const start_time = process.argv[4] ? parseInt(process.argv[4]) : new Date().getTime();

console.log('Loader for ',{symbol, timeframe, start_time}, 'start: ', new Date().toLocaleString());

Candles.Loader({ symbol, timeframe, start_time }).then((res) => {
  console.log(res, 'complete:', new Date().toLocaleString());
  process.exit(0);
});
