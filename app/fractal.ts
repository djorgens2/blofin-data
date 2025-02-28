//+------------------------------------------------------------------+
//|                                                       fractal.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Action, Direction, Bias } from "@/lib/std.defs.d";

import { SetEvent, ClearEvents, IsEventSet, EventType, AlertType } from "@app/event";
import { isBetween } from "@/lib/std.util";

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
  time: number;
  price: number;
}

interface ITrend {
  time: number;
  direction: Direction;
  lead: Bias;
  bias: Bias;
}

interface IBar extends ITrend {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IFractal extends ITrend {
  point: IFractalPoint;
  state: FractalState;
}

interface IFractalPoint {
  Origin: IPoint;
  Base: IPoint;
  Root: IPoint;
  Expansion: IPoint;
  Retrace: IPoint;
  Recovery: IPoint;
  Close: IBar;
}

//-- Data collections
const Bar: IBar[] = [];
const SMA: IBar[] = [];

let Fractal: IFractal;

//-- Work variables
let sma: { open: number; close: number; factor: number; digits: number };
let fractal: { min: number; max: number; minTime: number; maxTime: number; factor: number; digits: number };

//-- Utility functions ----------------------------------------------------//

//+------------------------------------------------------------------+
//| iBar - Returns bar index for supplied timestamp                  |
//+------------------------------------------------------------------+
function iBar(time: number): number {
  let left = 0;
  let right = Bar.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (Bar[mid].time === time) {
      return mid;
    }

    if (Bar[mid].time > time) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

//+------------------------------------------------------------------+
//| iHighest - Returns highest IBar(obj) between provided bounds     |
//+------------------------------------------------------------------+
function iHighest(timeStart?: number, timeStop?: number, includeStart: boolean = true): IBar {
  let startBar = timeStart ? iBar(timeStart) : 0;
  const stopBar = timeStop ? iBar(timeStop) : Bar.length - 1;
  const searchDir = stopBar - startBar > 0 ? Direction.Up : Direction.Down;
  
  startBar = !includeStart && isBetween(startBar,0,Bar.length-1) ? startBar+=searchDir : startBar;
  let searchIndex= startBar;

  while (startBar !== stopBar) {
    Bar[startBar].high > Bar[searchIndex].high && (searchIndex = startBar);
    startBar += searchDir;
  }

  return Bar[searchIndex];
}

//+------------------------------------------------------------------+
//| iLowest - Returns lowest IBar(obj) between provided bounds       |
//+------------------------------------------------------------------+
function iLowest(timeStart?: number, timeStop?: number, includeStart: boolean = true): IBar {
  let startBar = timeStart ? iBar(timeStart) : 0;
  const stopBar = timeStop ? iBar(timeStop) : Bar.length - 1;
  const searchDir = stopBar - startBar > 0 ? Direction.Up : Direction.Down;

  startBar = !includeStart && isBetween(startBar,0,Bar.length-1) ? startBar+=searchDir : startBar;
  let searchIndex= startBar;

  while (startBar !== stopBar) {
    Bar[startBar].low < Bar[searchIndex].low && (searchIndex = startBar);
    startBar += searchDir;
  }

  return Bar[searchIndex];
}

//-- Main calculation functions ------------------------------------------------//

//+------------------------------------------------------------------+
//| PublishBar - Wraps up Bar processing                             |
//+------------------------------------------------------------------+
export function PublishBar(candle: Partial<ICandle>, row: number) {
  // do work;

  // publish
  Bar.unshift({
    time: candle.time!,
    direction: Direction.None,
    lead: Bias.None,
    bias: Bias.None,
    open: candle.open!,
    high: candle.high!,
    low: candle.low!,
    close: candle.close!,
  });
}

//+------------------------------------------------------------------+
//| PublishSMA - Computes SMA measures, trend detail, values         |
//+------------------------------------------------------------------+
export function PublishSMA(row: number) {
  //-- Aggregate sma
  sma.open += Bar[0].open;
  sma.close += Bar[0].close;

  //-- Set SMA base
  if (row + 1 > sma.factor) {
    sma.open -= Bar[sma.factor].open;
    sma.close -= Bar[sma.factor].close;
  }

  SMA.unshift({
    time: Bar[0].time,
    direction: Direction.None,
    lead: Bias.None,
    bias: Bias.None,
    open: row + 1 < sma.factor ? 0 : sma.open / sma.factor,
    high: 0,
    low: 0,
    close: row + 1 < sma.factor ? 0 : sma.close / sma.factor,
  });
}

//+------------------------------------------------------------------+
//| FractalSetup - Instantiates new IFractal(obj)                    |
//+------------------------------------------------------------------+
function FractalSetup(row: number) {
  //-- Examine fractal condition
  if (fractal.minTime === fractal.maxTime) 
    console.log("Outside Reversal handler");
  else if (fractal.minTime > fractal.maxTime) {
    const base: IBar = iLowest(fractal.maxTime);
    const retrace: IBar = iHighest(fractal.minTime,Bar[0].time,false);

    Fractal.direction = Direction.Down;
    Fractal.point.Origin = { time: fractal.maxTime, price: fractal.max };
    Fractal.point.Base = { time: base.time, price: base.low };
    Fractal.point.Root = { time: fractal.maxTime, price: fractal.max };
    Fractal.point.Expansion = { time: fractal.minTime, price: fractal.min };
    Fractal.point.Retrace = { time: retrace.time, price: retrace.high };
  } else {
    const base: IBar = iHighest(fractal.minTime);
    const retrace: IBar = iLowest(fractal.maxTime,Bar[0].time,false);

    Fractal.direction = Direction.Up;
    Fractal.point.Origin = { time: fractal.minTime, price: fractal.min };
    Fractal.point.Base = { time: base.time, price: base.high };
    Fractal.point.Root = { time: fractal.minTime, price: fractal.min };
    Fractal.point.Expansion = { time: fractal.maxTime, price: fractal.max };
    Fractal.point.Retrace = { time: retrace.time, price: retrace.low };
  }
  console.log(Fractal);
}

//+------------------------------------------------------------------+
//| PublishFractal - completes fractal calcs                         |
//+------------------------------------------------------------------+
export function PublishFractal(row: number) {
  //-- Handle Fractal events
  if (Bar[0].high > fractal.max) {
    fractal.max = Bar[0].high;
    fractal.maxTime = Bar[0].time;

    SetEvent(EventType.NewHigh, AlertType.Minor);
  }

  if (Bar[0].low < fractal.min) {
    fractal.min = Bar[0].low;
    fractal.minTime = Bar[0].time;

    SetEvent(EventType.NewLow, AlertType.Minor);
  }

  if (row + 1 === fractal.factor) FractalSetup(row);
}

//-- Object initialization functions -----------------------------------------//

//+------------------------------------------------------------------+
//| initBar - Resets the Bar(obj) on change of currency pair         |
//+------------------------------------------------------------------+
function initializeBar() {
  Bar.splice(0, Bar.length);
}

//+------------------------------------------------------------------+
//| initFractal - Resets sma(work):SMA(obj) each currency            |
//+------------------------------------------------------------------+
function initSMA(factor: number, digits: number) {
  Bar.splice(0, SMA.length);
  sma = { open: 0, close: 0, factor: factor, digits: digits };
}

//+------------------------------------------------------------------+
//| initFractal - Resets fractal(work):Fractal(obj) each currency    |
//+------------------------------------------------------------------+
function initFractal(min: number, max: number, time: number, factor: number, digits: number) {
  Fractal = {
    time: 0,
    direction: Direction.None,
    lead: Bias.None,
    bias: Bias.None,
    point: {
      Origin: { time: 0, price: 0 },
      Base: { time: 0, price: 0 },
      Root: { time: 0, price: 0 },
      Expansion: { time: 0, price: 0 },
      Retrace: { time: 0, price: 0 },
      Recovery: { time: 0, price: 0 },
      Close: { time: 0,
        direction: Direction.None,
        lead: Bias.None,
        bias: Bias.None,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      }},
    state: FractalState.Breakout,
  };

  fractal = { min: min, max: max, minTime: time, maxTime: time, factor: factor, digits: digits };
}

//+------------------------------------------------------------------+
//| Update - Main Update loop; processes bar, sma, fractal, events   |
//+------------------------------------------------------------------+
export async function Update(instrument: Partial<IInstrument>) {
  const candles: Partial<ICandle>[] = await Candle.Fetch(instrument.instrument!, instrument.trade_period!);

  console.log(instrument);

  initializeBar();
  initSMA(instrument.sma_factor!, instrument.digits!);
  initFractal(candles[0].low!, candles[0].high!, candles[0].time!, instrument.sma_factor!, instrument.digits!);

  candles.forEach((candle, row) => {
    ClearEvents();

    PublishBar(candle, row);
    PublishSMA(row);
    PublishFractal(row);
  });
}
