//+------------------------------------------------------------------+
//|                                                       process.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { TradeState } from "@/db/interfaces/instrument";

import * as Instrument from "@/db/interfaces/instrument";
import * as Fractal from "@app/fractal";

//+------------------------------------------------------------------+
//| ProcessUpdate - Main update process for trade metrics/indicators |
//+------------------------------------------------------------------+
export async function ProcessUpdates() {
  const instruments = await Instrument.FetchActive();

  instruments.forEach((instrument) => {
    Fractal.Update(instrument);
  });
}

//+------------------------------------------------------------------+
//| Start - Main process for managing trade metrics and positions    |
//+------------------------------------------------------------------+
export async function Start() {
  const instruments = await Instrument.FetchState(TradeState.Enabled);

  instruments.forEach((instrument) => {
    
  });
}
