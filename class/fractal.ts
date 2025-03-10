//+------------------------------------------------------------------+
//|                                                       fractal.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "@/db/interfaces/instrument";
import type { ICandle } from "@/db/interfaces/candle";
import type { IMeasure } from "@lib/std.util"; //-- types

import * as Candle from "@db/interfaces/candle";

import { CEvent, Event, Alert } from "@class/event";
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

export interface IBar {
  time: number;
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
  #Instrument: Partial<IInstrument>;
  #Bar: ITrend[] = [];
  #SMA: IBar[] = [];
  #Fractal: IFractal;

  //-- Work variables
  #bar: { min: number; max: number; retrace: number };
  #sma: { open: number; close: number };
  #fractal: { min: number; max: number; minTime: number; maxTime: number };

  //-- Properties
  #timestamp: number = 0;
  #sma_factor: number = 0;
  #digits: number = 0;
  #bars: number = 0;

  //+------------------------------------------------------------------+
  //| Fractal constructor                                              |
  //+------------------------------------------------------------------+
  constructor(instrument: Partial<IInstrument>, bar: IBar) {
    super();

    this.#Instrument = structuredClone(instrument);
    this.#sma_factor = this.#Instrument.sma_factor!;
    this.#digits = this.#Instrument.digits!;
    this.#Fractal = {
      direction: Direction.None,
      lead: Bias.None,
      bias: Bias.None,
      state: State.Breakout,
      volume: 0,
      point: {
        Origin: { time: 0, price: 0 },
        Base: { time: 0, price: 0 },
        Root: { time: 0, price: 0 },
        Expansion: { time: 0, price: 0 },
        Retrace: { time: 0, price: 0 },
        Recovery: { time: 0, price: 0 },
        Close: { time: 0, price: 0 },
      },
    };

    this.#timestamp = bar.time;
    this.#bar = { min: bar.low, max: bar.high, retrace: bar.close > bar.open ? bar.high : bar.low };
    this.#sma = { open: 0, close: 0 };
    this.#fractal = { min: bar.low, max: bar.high, minTime: bar.time, maxTime: bar.time };

    //console.log(bar, this.#Instrument, this.#Bar, this.#bar, this.#Fractal, this.#fractal);
  }

  //+------------------------------------------------------------------+
  //| Update - Main Update loop; processes bar, sma, fractal, events   |
  //+------------------------------------------------------------------+
  async Update() {
    console.log('Updating')
    const candles: Array<Partial<ICandle>> = await Candle.FetchTimestamp(this.#Instrument.instrument!, this.#Instrument.trade_period!, this.#timestamp);
    console.log('data ready')

    candles.forEach((candle, row) => {
      this.clearEvents();

      // PublishBar(candle, row);
      // PublishSMA(row);
      // PublishFractal(row);
    });
  }

  //+------------------------------------------------------------------+
  //| Instrument - returns instrument details                          |
  //+------------------------------------------------------------------+
   Instrument(): Array<string> {
    return [this.#Instrument.currency_pair!, this.#Instrument.trade_timeframe!];
  }

  // bar.completed! && ();

  // direction: direction(candle.close! - candle.open!),
  // lead: bias(direction(candle.close! - candle.open!)),
  // bias: bias(direction(candle.close! - candle.open!)),
  // this.#Bar.push(bar);
}
