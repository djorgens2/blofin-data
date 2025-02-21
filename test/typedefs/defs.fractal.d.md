//+------------------------------------------------------------------+
//|                                                     fractal.d.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//|                                                                  |
//+------------------------------------------------------------------+
"use strict";

declare enum Fibonacci {
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
};

declare enum FractalState {
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
  FractalStates,
};

declare enum FractalPoint {
  Origin,
  Base,
  Root,
  Expansion,
  Retrace,
  Recovery,
  Close,
};

declare interface IFractal {
  time: number;
  direction: Direction;
  fractalPoint: number[];
  updatedAt: number;
};
