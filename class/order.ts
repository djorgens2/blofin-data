//+------------------------------------------------------------------+
//|                                                         order.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { IInstrument } from "@/db/interfaces/instrument";
import { Alert, Event } from "@class/event";
import { CFractal, IBar } from "@class/fractal";

export class COrder extends CFractal {
  constructor(instrument: Partial<IInstrument>, bar: IBar) {
    super(instrument!, bar);

  }

  update() {
    this.updateFractal();
  }
}
