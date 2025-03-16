//+------------------------------------------------------------------+
//|                                                          main.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import * as TradeState from "@db/interfaces/trade_state";
import * as Period from "@/db/interfaces/period";
import * as Instruments from "@api/instruments";
import * as Candles from "@api/candles";

import { CProcess } from "@app/process";

TradeState.Import();
Period.Import();
Instruments.Import();
Candles.BulkImport()

const app = new CProcess();

app.Start();
    
