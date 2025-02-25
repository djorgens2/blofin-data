//+------------------------------------------------------------------+
//|                                                       fractal.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Action, Direction, Bias } from "@/lib/std.defs.d";

import { SetEvent, ClearEvents, IsEventSet, EventType, AlertType } from "@app/event";
import { IsHigher, IsLower } from "@/lib/std.util";

import type { ICandle } from "@db/interfaces/candle";
import type { IInstrument } from "@/db/interfaces/instrument";

import * as Candle from "@db/interfaces/candle";

export enum Fibonacci {
  Root = 0,
  f23 = 0.236,
  f38 = 0.382,
  f50 = 0.5,
  f61 = 0.618,
  Correction = 0.764,
  Breakout = 1,
  f161 = 1.618,
  f261 = 2.618,
  f361 = 3.618,
  f423 = 4.236,
  f823 = 8.236,
  Count = 12,
}

export enum FractalState {
  NoState, // No State Assignment
  Rally, // Advancing fractal
  Pullback, // Declining fractal
  Retrace, // Pegged retrace (>Rally||Pullack)
  Correction, // Fractal max stress point/Market Correction
  Recovery, // Trend resumption post-correction
  Breakout, // Fractal Breakout
  Reversal, // Fractal Reversal
  Extension, // Fibonacci Extension
  Flatline, // Horizontal Trade/Idle market
  Consolidation, // Consolidating Range
  Parabolic, // Parabolic Expansion
  Channel, // Congruent Price Channel
  Count,
}

interface IPoint {
  Origin: number;
  Base: number;
  Root: number;
  Expansion: number;
  Retrace: number;
  Recovery: number;
  Close: number;
}

interface IBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
interface IDirection extends IBar {
  direction: Direction;
  lead: Bias;
  bias: Bias;
}

interface IFractal {
  time: number;
  direction: Direction;
  lead: Bias;
  bias: Bias;
  bar: IBar;
  sma: IBar;
  point: IPoint;
  volume: number;
  updatedAt: number;
}

//+------------------------------------------------------------------+
//| Publish - Wraps up Bar processing (sma, fractal, et al)          |
//+------------------------------------------------------------------+
export function Publish(candle: Partial<ICandle>, sma: Partial<IBar>) {
  console.log(sma);
}

//+------------------------------------------------------------------+
//| Update - Main processing loop; Updates trade metrics/indicators  |
//+------------------------------------------------------------------+
export async function Update(instrument: Partial<IInstrument>) {
  const candles: Partial<ICandle>[] = await Candle.Fetch(instrument.instrument!, instrument.trade_period!);

  const sma = { open: 0, close: 0 };
  const high = { value: candles[0].high!, digits: instrument.digits!, update: true };
  const low = { value: candles[0].low!, digits: instrument.digits!, update: true };

  candles.forEach((candle, row) => {
    ClearEvents();

    //-- Aggregate sma
    sma.open += candle.open!;
    sma.close += candle.close!;

    //-- Set SMA base
    if (row + 1 > instrument.sma_factor!) {
      sma.open -= candles[row - instrument.sma_factor!].open!;
      sma.close -= candles[row - instrument.sma_factor!].close!;
    }

    Publish(candle, {
      open: row + 1 < instrument.sma_factor! ? 0 : sma.open / instrument.sma_factor!,
      close: row + 1 < instrument.sma_factor! ? 0 : sma.close / instrument.sma_factor!,
    });

    //-- Handle Fractal events
    if (IsHigher(candle.high!, high)) SetEvent(EventType.NewHigh, AlertType.Minor);
    if (IsLower(candle.low!, low)) SetEvent(EventType.NewLow, AlertType.Minor);

    if (IsEventSet(EventType.NewHigh) && IsEventSet(EventType.NewLow)) {
      //console.log("New High: ", high.value.toFixed(high.digits), "NewLow", low.value.toFixed(low.digits));
    } else if (IsEventSet(EventType.NewHigh)) {
      //console.log("New High: ", high.value.toFixed(high.digits));
    } else if (IsEventSet(EventType.NewLow)) {
      //console.log("New Low: ", low.value.toFixed(low.digits));
    }
  });
}
