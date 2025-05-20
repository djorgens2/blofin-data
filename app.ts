//+------------------------------------------------------------------+
//|                                                           app.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import * as Instrument from "@api/instruments";
import * as Period from "@db/interfaces/period";
import * as State from "@db/interfaces/state";
import * as Broker from "@db/interfaces/state";
import * as Role from "@db/interfaces/state";

import { CMain } from "@app/main";

State.Import();
Period.Import();
Instrument.Import();
Broker.Import();
Role.Import();

const app = new CMain();

app.Start();
    
