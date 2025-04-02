//+------------------------------------------------------------------+
//|                                                          main.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import * as TradeState from "@db/interfaces/trade_state";
import * as Period from "@/db/interfaces/period";
import * as Instruments from "@api/instruments";

import { CApp } from "@app/app";

TradeState.Import();
Period.Import();
Instruments.Import();

const app = new CApp();

app.Start();
    
