//+------------------------------------------------------------------+
//|                                                       fractal.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { CEvent, Event, Alert } from "./event";
import { Action, Direction, Bias } from "@lib/std.util"; //-- enums
import { bias, direction, isBetween } from "@lib/std.util"; //-- functions

export const Fibonacci = {
  Root: 0,
  Pullback: [0.236, 0.382],
  Rally: [0.236, 0.382],
  DCA: 0.5,
  Retrace: 0.618,
  Correction: 0.764,
  Breakout: 1,
  Reversal: 1,
  Extension: [1.618, 2.618, 3.618, 4.236, 8.236],
};

export enum State {
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
}

interface IPoint {
  time: number;
  price: number;
}

interface IFractalPoint {
  Origin: IPoint;
  Base: IPoint;
  Root: IPoint;
  Expansion: IPoint;
  Retrace: IPoint;
  Recovery: IPoint;
  Close: IPoint;
}

interface ITrend {
  direction: Direction;
  lead: Bias;
  bias: Bias;
}

interface IBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class CFractal extends CEvent {
  //-- Data collections
  #Bar: IBar[] = [];
  #SMA: IBar[] = [];

  constructor() {
    super();
  }

  update() {}
}
