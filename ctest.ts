//+--------------------------------------------------------------------------------------+
//|                                                                             ctest.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "@/db/interfaces/instrument";
import type { IMessage } from "@lib/std.util"; //-- types

import { CFractal } from "@module/fractal";
import { CEvent, Event, Alert } from "@module/event";
import { Action, Direction, Bias } from "@lib/app.util"; //-- enums
import { bias, direction } from "@lib/app.util"; //-- functions
import { hex, clear, isBetween } from "@/lib/std.util";

import * as Instrument from "@db/interfaces/instrument";
import * as Candle from "@db/interfaces/candle";

async function init() {
  const message: IMessage = clear({ state: "init", symbol: "XRP-USDT", node: 0 });
  const [instrument]: Array<Partial<IInstrument>> = await Instrument.Fetch({ symbol: message.symbol });
  const fractal = await CFractal(message, instrument);
  const update = await fractal.Update(message);
  const text = fractal.active();
}

init();
