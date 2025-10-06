//+------------------------------------------------------------------+
//|                                                         order.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { ICandle } from "db/interfaces/candle";
import type { IInstrument } from "db/interfaces/instrument";

import { Alert, Event } from "module/event";
import { CFractal } from "module/fractal";

enum                OrderMethod
                      {
                        Hold,          // Hold (unless max risk)
                        Full,          // Close whole orders
                        Split,         // Close half orders 
                        Retain,        // Close half orders and hold
                        DCA,           // Close profit on DCA
                        Recapture,     // Risk mitigation position (not coded)
                        Stop,          // Sets Hard Target (Take Profit even if negative)
                        Halt,          // Close on market and stop;
                      };

export const COrder = (instrument: Partial<IInstrument>, candles: Array<Partial<ICandle>>) => {};
