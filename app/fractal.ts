//+------------------------------------------------------------------+
//|                                                       fractal.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { SetEvent, ClearEvents, IsEventSet, EventType, AlertType } from "@app/event";
import { IsHigher, IsLower } from "@components/std.util";

import type { ICompare } from "@components/std.util";
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

export enum FractalPoint {
  Origin,
  Base,
  Root,
  Expansion,
  Retrace,
  Recovery,
  Close,
}

export enum Bar {
  Open,
  Close,
  High,
  Low,
}

export interface IBar {
  time: number;
  price: [ number, number, number, number, ];
  volume: number;
  lead: Action;
  bias: Action;
  sma: [ number, number ];
}

export interface IFractal {
  time: number;
  direction: Direction;
  lead: Action;
  bias: Action;
  point: [ number, number, number, number, number, number, number ];
  updatedAt: number;
}

//+------------------------------------------------------------------+
//| Publish - Wraps up Bar processing (sma, fractal, et al)          |
//+------------------------------------------------------------------+
export function Publish(candle: Partial<ICandle>, sma:number[]) {
    //console.log(sma);
}

//+------------------------------------------------------------------+
//| Update - Main processing loop; Updates trade metrics/indicators  |
//+------------------------------------------------------------------+
export async function Update(instrument: Partial<IInstrument>) {
  const candles: Partial<ICandle>[] = await Candle.Fetch(instrument.instrument!, instrument.trade_period!);
  const sma: [number, number] = [ 0 ,0];
  const high: ICompare = { value: 0, digits: instrument.digits!, update: true };
  const low: ICompare = { value: 0, digits: instrument.digits!, update: true };

  candles.forEach((candle, row) => {
    ClearEvents();

    if (row === 0) {
      //-- Initialize sma
      sma[Bar.Open] = candle.open!;
      sma[Bar.Close] = candle.close!;

      //-- Initialize fractal
      high.value = candle.high!;
      low.value = candle.low!;

    } else {
      //-- Aggregate sma
      sma[Bar.Open] += candle.open!;
      sma[Bar.Close] += candle.close!;

      //-- Set SMA base
      if (row >= instrument.sma_factor!) {
        sma[Bar.Open] -= candles[row - instrument.sma_factor!].open!;
        sma[Bar.Close] -= candles[row - instrument.sma_factor!].close!;
      }

      Publish(candle, [
        row+1<instrument.sma_factor! ? 0 : sma[Bar.Open]/instrument.sma_factor!,
        row+1<instrument.sma_factor! ? 0 : sma[Bar.Close]/instrument.sma_factor!
      ]);

      //-- Handle Fractal events
      if (IsHigher(candle.high!, high)) SetEvent(EventType.NewHigh, AlertType.Minor);
      if (IsLower(candle.low!, low)) SetEvent(EventType.NewLow, AlertType.Minor);
    }

    if (IsEventSet(EventType.NewHigh) && IsEventSet(EventType.NewLow)) {
      console.log("New High: ", high.value.toFixed(high.digits), "NewLow", low.value.toFixed(low.digits));
    } else if (IsEventSet(EventType.NewHigh)) {
      console.log("New High: ", high.value.toFixed(high.digits));
    } else if (IsEventSet(EventType.NewLow)) {
      console.log("New Low: ", low.value.toFixed(low.digits));
    }
  });
}
