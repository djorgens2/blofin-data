//+--------------------------------------------------------------------------------------+
//|                                                                           fractal.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "@db/interfaces/instrument";
import type { ICandle } from "@db/interfaces/candle";
import type { IMeasure } from "@lib/app.util"; //-- types
import type { IMessage } from "@lib/std.util";

import { CEvent, Event, Alert } from "@class/event";
import { Direction, Bias } from "@lib/app.util"; //-- enums
import { bias, direction } from "@lib/app.util"; //-- functions
import { isBetween, fileWrite } from "@lib/std.util";

import * as Candle from "@db/interfaces/candle";

const FibonacciPercent = {
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

enum State {
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

interface IBar {
  timestamp: number;
  direction: Direction;
  lead: Bias;
  bias: Bias;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  completed: boolean;
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
  const Bar: Array<IBar> = [];
  const SMA: Array<IBar> = [];

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

  //-- Work variables -------------------------------------------------------//
  const fractal = { min: start.low!, max: start.high!, minTime: start.start_time!, maxTime: start.start_time! };
  const bar = { min: start.low!, max: start.high!, retrace: start.close! > start.open! ? start.high! : start.low! };
  const sma = { open: 0, close: 0 };

  //-- Properties -------------------------------------------------------------------------------//
  const periods: number = instrument.sma_factor!;
  const digits: number = instrument.digits!;

  let timestamp: number = start.timestamp!;
  let bars: number = candles.length;

  //-- Utility functions ------------------------------------------------------------------------//

  //+------------------------------------------------------------------+
  //| iBar - Returns bar index for supplied timestamp                  |
  //+------------------------------------------------------------------+
  function iBar(time: number): number {
    let left = 0;
    let right = Bar.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (Bar[mid].timestamp === time) return mid;

      Bar[mid].timestamp > time ? (left = mid + 1) : (right = mid - 1);
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

    !includeStart && isBetween(startBar, 0, Bar.length - 1) && (startBar += searchDir);
    let searchIndex = startBar;

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

    !includeStart && isBetween(startBar, 0, Bar.length - 1, false) && (startBar += searchDir);

    let searchIndex = startBar;

    while (startBar !== stopBar) {
      Bar[startBar].low < Bar[searchIndex].low && (searchIndex = startBar);
      startBar += searchDir;
    }

    return Bar[searchIndex];
  }

  //+--------------------------------------------------------------------------------------+
  //| Main Update loop; processes bar, sma, fractal, events                                |
  //+--------------------------------------------------------------------------------------+
  const Update = async (message: IMessage) => {
    const limit: number = 100; //-- derived from timestamp
    const candles: Array<Partial<ICandle>> = await Candle.Fetch(props, limit);

    process.send && process.send(message);
  };

  //+------------------------------------------------------------------+
  //| PublishSMA - Computes SMA measures, trend detail, values         |
  //+------------------------------------------------------------------+
  function PublishSMA(row: number) {
    //-- Aggregate sma
    sma.open += Bar[0].open;
    sma.close += Bar[0].close;

    //-- Set SMA base
    if (row + 1 > periods) {
      sma.open -= Bar[periods].open;
      sma.close -= Bar[periods].close;
    }

    SMA.unshift({
      timestamp: Bar[0].timestamp!,
      direction: Direction.None,
      lead: Bias.None,
      bias: Bias.None,
      volume: Bar[0].volume!,
      open: row + 1 < periods ? 0 : parseFloat((sma.open / periods).toFixed(digits+1)),
      high: 0,
      low: 0,
      close: row + 1 < periods ? 0 : parseFloat((sma.close / periods).toFixed(digits+1)),
      completed: Bar[0].completed,
    });
  }

  //+------------------------------------------------------------------+
  //| PublishBar - Wraps up Bar processing                             |
  //+------------------------------------------------------------------+
  function PublishBar(candle: Partial<ICandle>, row: number) {
    const prior = {
      direction: Bar[0].direction,
      lead: Bar[0].lead,
      bias: Bar[0].bias,
      open: Bar[0].open,
      high: Bar[0].high,
      low: Bar[0].low,
      close: Bar[0].close,
    };

    //--- set Bias
    if (prior.open !== candle.close!) {
      prior.bias !== bias(direction(candle.close! - prior.open)) && event.setEvent(Event.NewBias, Alert.Notify);
      prior.bias = bias(direction(candle.close! - prior.open));
    }

    if (prior.low > candle.low!) {
      event.setEvent(Event.NewLow, Alert.Notify);
      event.setEvent(Event.NewBoundary, Alert.Notify);
    }

    if (prior.high < candle.high!) {
      event.setEvent(Event.NewHigh, Alert.Notify);
      event.setEvent(Event.NewBoundary, Alert.Notify);
    }

    if (event.isEventActive(Event.NewBoundary)) {
      //--- set Lead
      if (prior.low > candle.low! && prior.high < candle.high!) {
        event.setEvent(Event.NewOutsideBar, Alert.Nominal);
      } else {
        if (prior.low > candle.low!) {
          prior.lead !== Bias.Short && event.setEvent(Event.NewLead, Alert.Nominal);
          prior.lead = Bias.Short;

          event.setEvent(Event.NewLow, Alert.Nominal);
          event.setEvent(Event.NewBoundary, Alert.Nominal);
        }

        if (prior.high < candle.high!) {
          prior.lead !== Bias.Long && event.setEvent(Event.NewLead, Alert.Nominal);
          prior.lead = Bias.Long;

          event.setEvent(Event.NewHigh, Alert.Nominal);
          event.setEvent(Event.NewBoundary, Alert.Nominal);
        }
      }

      //--- set Direction
      if (bar.min > candle.low! && bar.max < candle.high!) {
        event.setEvent(Event.NewOutsideBar, Alert.Minor);
      } else {
        if (bar.min > candle.low!) {
          prior.direction !== Direction.Down && event.setEvent(Event.NewDirection, Alert.Minor);
          prior.direction = Direction.Down;

          event.setEvent(Event.NewBoundary, Alert.Minor);
        }

        if (bar.max < candle.high!) {
          prior.direction !== Direction.Up && event.setEvent(Event.NewDirection, Alert.Minor);
          prior.direction = Direction.Up;

          event.setEvent(Event.NewBoundary, Alert.Minor);
        }
      }
    }

    if (row > 0) {
      if (event.isEventActive(Event.NewLead)) {
        prior.lead === Bias.Long ? ((bar.min = bar.retrace), (bar.retrace = candle.high!)) : ((bar.max = bar.retrace), (bar.retrace = candle.low!));
      }
      event.isEventActive(Event.NewHigh) && prior.direction === Direction.Up && ((bar.retrace = candle.high!), (bar.max = candle.high!));
      event.isEventActive(Event.NewLow) && prior.direction === Direction.Down && ((bar.retrace = candle.low!), (bar.min = candle.low!));

      // publish
      Bar.unshift({
        timestamp: candle.timestamp!,
        direction: prior.direction!,
        lead: prior.lead!,
        bias: prior.bias!,
        volume: candle.volume!,
        open: candle.open!,
        high: candle.high!,
        low: candle.low!,
        close: candle.close!,
        completed: candle.completed!,
      });
    }

    if (row < 60) {
      console.log(
        row.toFixed(0).concat(":"),
        event.isEventActive(Event.NewDirection)
          ? "NewDirection: "
          : event.isEventActive(Event.NewLead)
          ? "NewLead: "
          : event.isEventActive(Event.NewBoundary)
          ? "NewBoundary: "
          : "NewBar: ",
        prior,
        bar
      );
      event.isAnyEventActive() ? console.log(event.activeEvents()) : console.log("---");
    }
  }

  //+------------------------------------------------------------------+
  //| setFibonacci - Calculate fibonacci sequence%'s on active Fractal |
  //+------------------------------------------------------------------+
  function setFibonacci(): IFibonacci {
    const recovery: number = Fractal.point.Recovery.timestamp > 0 ? Fractal.point.Recovery.price : Fractal.point.Retrace.price;
    return {
      retrace: {
        min: parseFloat((1 - (Fractal.point.Root.price - recovery) / (Fractal.point.Root.price - Fractal.point.Expansion.price)).toFixed(3)),
        max: parseFloat((1 - (Fractal.point.Root.price - Fractal.point.Retrace.price) / (Fractal.point.Root.price - Fractal.point.Expansion.price)).toFixed(3)),
        now: parseFloat((1 - (Fractal.point.Root.price - Bar[0].close) / (Fractal.point.Root.price - Fractal.point.Expansion.price)).toFixed(3)),
      },
      extension: {
        min: parseFloat(((Fractal.point.Root.price - Fractal.point.Retrace.price) / (Fractal.point.Root.price - Fractal.point.Base.price)).toFixed(3)),
        max: parseFloat(((Fractal.point.Root.price - Fractal.point.Expansion.price) / (Fractal.point.Root.price - Fractal.point.Base.price)).toFixed(3)),
        now: parseFloat(((Fractal.point.Root.price - Bar[0].close) / (Fractal.point.Root.price - Fractal.point.Base.price)).toFixed(3)),
      },
    };
  }

  //+------------------------------------------------------------------+
  //| setFractal - Instantiates/Initializes new IFractal(obj)          |
  //+------------------------------------------------------------------+
  const setFractal = () => {
    if (fractal.minTime === fractal.maxTime) console.log("Outside Reversal handler");
    else if (fractal.minTime > fractal.maxTime) {
      const base: IBar = iLowest(fractal.maxTime);
      const retrace: IBar = iHighest(fractal.minTime, Bar[0].timestamp, false);
      const recovery: IBar = iLowest(retrace.timestamp, Bar[0].timestamp, false);

      Fractal.direction = Direction.Down;
      Fractal.point.Origin = { timestamp: fractal.maxTime, price: fractal.max };
      Fractal.point.Base = { timestamp: base.timestamp, price: Math.min(base.low, SMA[0].close) };
      Fractal.point.Root = { timestamp: fractal.maxTime, price: fractal.max };
      Fractal.point.Expansion = { timestamp: fractal.minTime, price: fractal.min };
      Fractal.point.Retrace = { timestamp: retrace.timestamp, price: retrace.timestamp > fractal.minTime ? retrace.high : retrace.close };
      Fractal.point.Recovery = {
        timestamp: recovery.timestamp > retrace.timestamp ? recovery.timestamp : 0,
        price: recovery.timestamp > retrace.timestamp ? recovery.low : 0,
      };
    } else {
      const base: IBar = iHighest(fractal.minTime);
      const retrace: IBar = iLowest(fractal.maxTime, Bar[0].timestamp, false);
      const recovery: IBar = iHighest(retrace.timestamp, Bar[0].timestamp, false);

      Fractal.direction = Direction.Up;
      Fractal.point.Origin = { timestamp: fractal.minTime, price: fractal.min };
      Fractal.point.Base = { timestamp: base.timestamp, price: Math.max(base.high, SMA[0].close) };
      Fractal.point.Root = { timestamp: fractal.minTime, price: fractal.min };
      Fractal.point.Expansion = { timestamp: fractal.maxTime, price: fractal.max };
      Fractal.point.Retrace = { timestamp: retrace.timestamp, price: retrace.timestamp > fractal.maxTime ? retrace.low : retrace.close };
      Fractal.point.Recovery = {
        timestamp: recovery.timestamp > retrace.timestamp ? recovery.timestamp : 0,
        price: recovery.timestamp > retrace.timestamp ? recovery.high : 0,
      };
    }
  };

  //+------------------------------------------------------------------+
  //| PublishFractal - completes fractal calcs                         |
  //+------------------------------------------------------------------+
  function PublishFractal(row: number) {
    //-- Handle Fractal events
    if (Bar[0].high > fractal.max) {
      fractal.max = Bar[0].high;
      fractal.maxTime = Bar[0].timestamp;

      event.setEvent(Event.NewHigh, Alert.Minor);
    }

    if (Bar[0].low < fractal.min) {
      fractal.min = Bar[0].low;
      fractal.minTime = Bar[0].timestamp;

      event.setEvent(Event.NewLow, Alert.Minor);
    }

    if (row + 1 >= periods) {
      if (row + 1 === periods) setFractal();
    }

    console.log(Fractal, setFibonacci());
  }

  //-- Main initialization Section --------------------------------------------------------------//

  Bar.unshift({
    timestamp: start.timestamp!,
    direction: direction(start.close! - start.open!),
    lead: bias(direction(start.close! - start.open!)),
    bias: bias(direction(start.close! - start.open!)),
    volume: start.volume!,
    open: start.open!,
    high: start.high!,
    low: start.low!,
    close: start.close!,
    completed: start.completed!,
  });

  candles
    .slice()
    .reverse()
    .forEach((candle, bar) => {
      event.clearEvents();

      PublishBar(candle, bar);
      PublishSMA(bar);
      PublishFractal(bar);
    });
//   fileWrite("ctest-sys.log", SMA.slice().reverse().map((item) => item.close));
  return { Update, activeEvents: event.activeEvents, isAnyEventActive: event.isAnyEventActive };
};
