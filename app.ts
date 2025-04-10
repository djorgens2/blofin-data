//+------------------------------------------------------------------+
//|                                                           app.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import * as Instruments from "@api/instruments";
import * as Period from "@/db/interfaces/period";
import * as TradeState from "@db/interfaces/trade_state";

import { CMain } from "@app/main";

TradeState.Import();
Period.Import();
Instruments.Import();

const app = new CMain();

app.Start();
    
