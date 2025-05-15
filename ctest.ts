//+--------------------------------------------------------------------------------------+
//|                                                                             ctest.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "@/db/interfaces/instrument";
import type { IMessage } from "@lib/app.util"; //-- types

import { CFractal } from "@module/fractal";
import { clear } from "@lib/app.util"; //-- functions

import * as Instrument from "@db/interfaces/instrument";

async function init() {
  const message: IMessage = clear({ state: "init", symbol: "XRP-USDT", node: 0 });
  const [instrument]: Array<Partial<IInstrument>> = await Instrument.Fetch({ symbol: message.symbol });
  const fractal = await CFractal(message, instrument);
  const update = await fractal.Update(message);
  const text = fractal.active();
}

init();
