//+------------------------------------------------------------------+
//|                                                         order.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { ICandle } from "@/db/interfaces/candle";
import type { IInstrument } from "@/db/interfaces/instrument";

import { Alert, Event } from "@class/event";
import { CFractal } from "@class/fractal";

export class COrder extends CFractal {
  constructor(instrument: Partial<IInstrument>, candle: Partial<ICandle>) {
    super(instrument!, candle!);

  }

  Process() {
    console.log(this.Identification());

    this.Update();
  }
}
