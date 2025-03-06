//+------------------------------------------------------------------+
//|                                                         order.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Alert, Event } from "@class/event";
import { CFractal } from "@class/fractal";

export class COrder extends CFractal {
    update () {
        this.setEvent(Event.NewHigh, Alert.Critical);
        console.log(this.activeEvents())
    }
}


