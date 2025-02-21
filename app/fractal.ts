//+------------------------------------------------------------------+
//|                                                       fractal.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//|                                                                  |
//+------------------------------------------------------------------+
"use strict";

import type { EventType as TEvent, AlertType as TAlert } from "@app/event";
import type { Direction as TDirection, Action as TAction } from "@components/std.util";

import { SetEvent, ClearEvents, IsEventSet, EventType, AlertType } from "@app/event";
import { ICompare, IsHigher, IsLower, Direction, Action } from "@components/std.util";
import { ICandle, Fetch } from "@db/interfaces/candle";
import { IInstrumentPair } from "@db/interfaces/instrument";

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

export interface IFractal {
  time: number;
  direction: Direction;
  lead: Action;
  bias: Action;
  point: number[];
  updatedAt: number;
}

function updateFractal(Price: ICompare) {
  /*console.log(Price)*/
}

export async function CalculateFractal(pair: Partial<IInstrumentPair>) {
  const candles: Partial<ICandle>[] = await Fetch(pair.instrument!, pair.period!);

  const sma: number = pair.sma_factor!;

  let smaOpen: number;
  let smaClose: number;
  let high: ICompare = { Value: 0, Precision: 6, Update: true };
  let low: ICompare = { Value: 0, Precision: 6, Update: true };

  candles.forEach((item, row) => {
    ClearEvents();

    if (row === 0) {
      //-- Initialize sma
      smaOpen = item.open!;
      smaClose = item.close!;

      //-- Initialize fractal
      high.Value = item.high!;
      low.Value = item.low!;
    } else {
      //-- Aggregate sma
      smaOpen += item.open!;
      smaClose += item.close!;

      //-- Set SMA base
      if (row >= sma) {
        smaOpen -= candles[row - sma].open!;
        smaClose -= candles[row - sma].close!;
      }

      //-- Handle Fractal events
      if (IsHigher(item.high!, high)) SetEvent(EventType.NewHigh, AlertType.Minor);

      if (IsLower(item.low!, low)) SetEvent(EventType.NewLow, AlertType.Minor);
    }

    if (IsEventSet(EventType.NewHigh) && IsEventSet(EventType.NewLow)) {
      console.log("New High: ", high.Value.toFixed(high.Precision), "NewLow", low.Value.toFixed(low.Precision));
    } else if (IsEventSet(EventType.NewHigh)) {
      console.log("New High: ", high.Value.toFixed(high.Precision));
    } else if (IsEventSet(EventType.NewLow)) {
      console.log("New Low: ", low.Value.toFixed(low.Precision));
    }

    //  if (row+1>=sma)
    //    console.log(row, [smaOpen, smaClose], [smaOpen/sma, smaClose/sma]);
  });
}
