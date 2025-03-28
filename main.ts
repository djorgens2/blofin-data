//+------------------------------------------------------------------+
//|                                                          main.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import * as States from "@db/interfaces/trade_state";
import * as Period from "@/db/interfaces/period";
import * as Instruments from "@api/instruments";

import { CProcess } from "@app/process";

States.Import();
Period.Import();
Instruments.Import();

const app = new CProcess();

app.Start();
    
