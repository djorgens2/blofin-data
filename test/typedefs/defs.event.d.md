//+------------------------------------------------------------------+
//|                                                         Event.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//|                                                                  |
//+------------------------------------------------------------------+
"use strict";

declare enum AlertType {
  NoAlert,
  Notify,
  Nominal,
  Warning,
  Minor,
  Major,
  Critical,
  Count,
};

declare enum EventType {
  NoEvent,
  AdverseEvent, //-- Very bad event
  NewHigh,
  NewLow,
  NewBoundary,
  NewDirection, //-- Directional change
  NewState,
  NewBias,
  NewTick, //-- Tick level event; aggregate or trade
  NewSegment, //-- Segment level event; aggregate of Ticks
  NewContraction,
  NewFractal, //-- Fractal Direction change
  NewFibonacci, //-- Fibonacci Level change only
  NewOrigin,
  NewTrend,
  NewTerm,
  NewLead,
  NewExpansion,
  NewDivergence,
  NewConvergence,
  NewRally,
  NewPullback,
  NewRetrace,
  NewCorrection,
  NewRecovery,
  NewBreakout,
  NewReversal,
  NewExtension,
  NewFlatline,
  NewConsolidation,
  NewParabolic, //-- Expanding, Multidirectional (parabolic) event
  NewChannel,
  CrossCheck,
  Exception,
  SessionOpen,
  SessionClose,
  NewDay,
  NewHour,
  Count,
};

declare const et: typeof EventType;
declare const at: typeof AlertType;
