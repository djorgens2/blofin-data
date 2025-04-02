//+------------------------------------------------------------------+
//|                                                       fractal.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "@/db/interfaces/instrument";
import type { ICandle } from "@/db/interfaces/candle";
import type { IMeasure } from "@lib/app.util"; //-- types

import * as Candle from "@db/interfaces/candle";

import { CEvent, Event, Alert } from "@class/event";
import { Action, Direction, Bias } from "@lib/app.util"; //-- enums
import { bias, direction } from "@lib/app.util"; //-- functions
import { isBetween } from "@/lib/std.util";

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

interface ITrend extends IBar {
  direction: Direction;
  lead: Bias;
  bias: Bias;
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

//+------------------------------------------------------------------+
//| Class CFractal                                                   |
//+------------------------------------------------------------------+
export class CFractal extends CEvent {
  //-- Data collections
  private Instrument: Partial<IInstrument>;
  private Bar: ITrend[] = [];
  private SMA: IBar[] = [];
  private Fractal: IFractal;

  //-- Identification
  private instrument: Uint8Array;
  private period: Uint8Array;

  //-- Work variables
  private bar: { min: number; max: number; retrace: number };
  private sma: { open: number; close: number };
  private fractal: { min: number; max: number; minTime: number; maxTime: number };

  //-- Properties
  private timestamp: number = 0;
  private sma_factor: number = 0;
  private digits: number = 0;
  private bars: number = 0;

  //+------------------------------------------------------------------+
  //| Fractal constructor                                              |
  //+------------------------------------------------------------------+
  constructor(instrument: Partial<IInstrument>, candles: Array<Partial<ICandle>>) {
    super();

    this.Instrument = structuredClone(instrument);
    this.instrument = this.Instrument.instrument!;
    this.period = this.Instrument.period!;
    this.sma_factor = this.Instrument.sma_factor!;
    this.digits = this.Instrument.digits!;
    this.Fractal = {
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

    this.bar = {min: 0, max:0, retrace: 0}
    this. sma = { open: 0, close: 0};
    this.fractal = { min: 0, max: 0, minTime: 0, maxTime: 0 };
    // this.timestamp = candle.timestamp!;
    // this.bar = { min: candle.low!, max: candle.high!, retrace: candle.close! > candle.open! ? candle.high! : candle.low! };
    // this.sma = { open: 0, close: 0 };
    // this.fractal = { min: candle.low!, max: candle.high!, minTime: candle.start_time!, maxTime: candle.start_time! };

    // console.log(candle!, this.Instrument, this.Bar, this.bar, this.Fractal, this.fractal);
  }

  //+------------------------------------------------------------------+
  //| Update - Main Update loop; processes bar, sma, fractal, events   |
  //+------------------------------------------------------------------+
  initialize() {
    //-- Work variables
    // bar: {
    //   min: number;
    //   max: number;
    //   retrace: number;
    // }
    // sma: {
    //   open: number;
    //   close: number;
    // }
    // fractal: {
    //   min: number;
    //   max: number;
    //   minTime: number;
    //   maxTime: number;
    // }

    // console.log("Updating");
    // const candles: Array<Partial<ICandle>> = await Candle.FetchTimestamp(this.Instrument.instrument!, this.Instrument.trade_period!, this.timestamp);
    // console.log("data ready");

    // candles.forEach((candle, row) => {
    //   this.clearEvents();

      // PublishBar(candle, row);
      // PublishSMA(row);
      // PublishFractal(row);
    // });
  }

  //+------------------------------------------------------------------+
  //| Update - Main Update loop; processes bar, sma, fractal, events   |
  //+------------------------------------------------------------------+
  async Update() {
    console.log("Updating");
//    const candles: Array<Partial<ICandle>> = await Candle.FetchTimestamp(this.Instrument.instrument!, this.Instrument.trade_period!, this.timestamp);
    console.log("data ready");

//    candles.forEach((candle, row) => {
//      this.clearEvents();

      // PublishBar(candle, row);
      // PublishSMA(row);
      // PublishFractal(row);
//    });
  }

  //+------------------------------------------------------------------+
  //| Identification - returns instrument details                          |
  //+------------------------------------------------------------------+
  Exists(instrument: Uint8Array, period: Uint8Array): boolean {
    return instrument === this.instrument && period === this.period;
  }

  //+------------------------------------------------------------------+
  //| Identification - returns instrument details                          |
  //+------------------------------------------------------------------+
  Identification(): Array<string> {
    return [this.Instrument.symbol!, this.Instrument.trade_timeframe!];
  }

  // bar.completed! && ();

  // direction: direction(candle.close! - candle.open!),
  // lead: bias(direction(candle.close! - candle.open!)),
  // bias: bias(direction(candle.close! - candle.open!)),
  // this.Bar.push(bar);
}
