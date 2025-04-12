//+------------------------------------------------------------------+
//|                                                         order.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { ICandle } from "@/db/interfaces/candle";
import type { IInstrument } from "@/db/interfaces/instrument";

import { Alert, Event } from "@module/event";
import { CFractal } from "@module/fractal";

export const COrder = (instrument: Partial<IInstrument>, candles: Array<Partial<ICandle>>) => {

}

