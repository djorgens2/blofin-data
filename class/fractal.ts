//+--------------------------------------------------------------------------------------+
//|                                                                           fractal.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "@/db/interfaces/instrument";
import type { ICandle } from "@/db/interfaces/candle";
import type { IMeasure } from "@lib/app.util"; //-- types

import * as Candle from "@db/interfaces/candle";

import { CEvent, Event, Alert } from "@class/event";
import { Action, Direction, Bias } from "@lib/app.util"; //-- enums
import { bias, direction } from "@lib/app.util"; //-- functions
import { hex, IMessage, isBetween } from "@/lib/std.util";
import { LiaMittenSolid } from "react-icons/lia";

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

export interface IBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  completed: boolean;
}

interface IBars extends IBar {
  direction: Direction;
  lead: Bias;
  bias: Bias;
  sma: number;
}

interface IPoint {
  timestamp: number;
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

interface IFractal {
  direction: Direction;
  lead: Bias;
  bias: Bias;
  state: State;
  volume: number;
  point: IFractalPoint;
}

interface IFibonacci {
  retrace: IMeasure;
  extension: IMeasure;
}

//+--------------------------------------------------------------------------------------+
//| Class CFractal                                                                       |
//+--------------------------------------------------------------------------------------+
export const CFractal = async (instrument: Partial<IInstrument>) => {
  const event = CEvent();
  const Bar: Array<IBars> = [];
  const Fractal: IFractal = {
    direction: Direction.None,
    lead: Bias.None,
    bias: Bias.None,
    state: State.Breakout,
    volume: 0,
    point: {
      Origin: { timestamp: 0, price: 0 },
      Base: { timestamp: 0, price: 0 },
      Root: { timestamp: 0, price: 0 },
      Expansion: { timestamp: 0, price: 0 },
      Retrace: { timestamp: 0, price: 0 },
      Recovery: { timestamp: 0, price: 0 },
      Close: { timestamp: 0, price: 0 },
    },
  };
  const props: Candle.IKeyProps = {
    instrument: instrument.instrument!,
    symbol: instrument.symbol!,
    period: instrument.trade_period!,
    timeframe: instrument.trade_timeframe!,
  };
  const candles: Array<Partial<ICandle>> = await Candle.Fetch(props, 10000); //-- limit will be added to instrument
  const start: Partial<ICandle> = structuredClone(candles[candles.length - 1]);

  //-- Work variables
  const fractal = { min: start.low!, max: start.high!, minTime: start.start_time!, maxTime: start.start_time! };
  const bar = { min: start.low!, max: start.high!, retrace: start.close! > start.open! ? start.high! : start.low! };
  const sma = { open: 0, close: 0 };

  //-- Properties
  const sma_factor: number = instrument.sma_factor!;
  const digits: number = instrument.digits!;

  let timestamp: number = start.timestamp!;
  let bars: number = candles.length;

  //+--------------------------------------------------------------------------------------+
  //| Main Update loop; processes bar, sma, fractal, events                                |
  //+--------------------------------------------------------------------------------------+
  const Update = async (message: IMessage) => {
    const limit: number = 100; //-- derived from timestamp
    const candles: Array<Partial<ICandle>> = await Candle.Fetch(props, limit);
    event.setEvent(Event.NewBias);
    event.setEvent(Event.NewHour, Alert.Major);
    event.setEvent(Event.NewHigh, Alert.Nominal);
    event.setEvent(Event.NewBoundary, Alert.Minor);
    event.setEvent(Event.NewLow, Alert.Minor);
    event.setEvent(Event.NewOutsideBar, Alert.Major);

    console.log(event.eventText(Event.NewDay));
    console.log(event.activeEvents());
    
    process.send && process.send(message);
  };

  //      clearEvents() {return this.clearEvents()}
  candles.forEach((candle) => {
    Bar.push({
      direction: Direction.None,
      lead: Bias.None,
      bias: Bias.None,
      sma: 0,
      timestamp: candle.timestamp!,
      open: candle.open!,
      high: candle.high!,
      low: candle.low!,
      close: candle.close!,
      volume: candle.volume!,
      completed: candle.completed!,
    });
  });

  return { Update, activeEvents: event.activeEvents, isAnyEventActive: event.isAnyEventActive };

};
