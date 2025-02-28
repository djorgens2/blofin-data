//+------------------------------------------------------------------+
//|                                                       process.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import * as Instrument from "@/db/interfaces/instrument";
import * as Fractal from "@app/fractal";

//+------------------------------------------------------------------+
//| ProcessUpdate - Main update process for trade metrics/indicators |
//+------------------------------------------------------------------+
export async function ProcessUpdates() {
  const instruments = await Instrument.FetchActive();

  instruments.forEach((instrument) => {
//    console.log(instrument)
    Fractal.Update(instrument);
  });
}
