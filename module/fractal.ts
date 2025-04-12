//+--------------------------------------------------------------------------------------+
//|                                                                           fractal.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "@db/interfaces/instrument";
import type { ICandle } from "@db/interfaces/candle";
import type { IMeasure } from "@lib/app.util"; //-- types
import type { IMessage } from "@lib/std.util";

import { CEvent, Event, Alert } from "@module/event";
import { Direction, Bias } from "@lib/app.util"; //-- enums
import { bias, direction } from "@lib/app.util"; //-- functions
import { isBetween, fileWrite, format } from "@lib/std.util";

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

interface IPrice {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IBar extends IPrice {
  timestamp: number;
  direction: Direction;
  lead: Bias;
  bias: Bias;
}

interface IBarExtended extends IBar {
  volume: number;
  vol_currency: number;
  vol_currency_quote: number;
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
  const Bar: Partial<IBar> = {};
  const SMA: Partial<IBar> = {};
  const Fractal: Partial<IFractal> = {};
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
  const price: Array<IPrice> = [];

  //-- Properties -------------------------------------------------------------------------------//
  const periods: number = instrument.sma_factor!;
  const digits: number = instrument.digits!;

  let timestamp: number = start.timestamp!;
  let bars: number = candles.length;

  //-- Utility functions ------------------------------------------------------------------------//

  //+------------------------------------------------------------------+
  //| iBar - Returns bar index for supplied timestamp                  |
  //+------------------------------------------------------------------+
  // function iBar(time: number): number {
  //   let left = 0;
  //   let right = Bar.length - 1;

  //   while (left <= right) {
  //     const mid = Math.floor((left + right) / 2);
  //     if (Bar[mid].timestamp === time) return mid;

  //     Bar[mid].timestamp > time ? (left = mid + 1) : (right = mid - 1);
  //   }

  //   return -1;
  // }

  // //+------------------------------------------------------------------+
  // //| iHighest - Returns highest IBar(obj) between provided bounds     |
  // //+------------------------------------------------------------------+
  // function iHighest(timeStart?: number, timeStop?: number, includeStart: boolean = true): IBar {
  //   let startBar = timeStart ? iBar(timeStart) : 0;
  //   const stopBar = timeStop ? iBar(timeStop) : Bar.length - 1;
  //   const searchDir = stopBar - startBar > 0 ? Direction.Up : Direction.Down;

  //   !includeStart && isBetween(startBar, 0, Bar.length - 1) && (startBar += searchDir);
  //   let searchIndex = startBar;

  //   while (startBar !== stopBar) {
  //     Bar[startBar].high > Bar[searchIndex].high && (searchIndex = startBar);
  //     startBar += searchDir;
  //   }

  //   return Bar[searchIndex];
  // }

  // //+------------------------------------------------------------------+
  // //| iLowest - Returns lowest IBar(obj) between provided bounds       |
  // //+------------------------------------------------------------------+
  // function iLowest(timeStart?: number, timeStop?: number, includeStart: boolean = true): IBar {
  //   let startBar = timeStart ? iBar(timeStart) : 0;

  //   const stopBar = timeStop ? iBar(timeStop) : Bar.length - 1;
  //   const searchDir = stopBar - startBar > 0 ? Direction.Up : Direction.Down;

  //   !includeStart && isBetween(startBar, 0, Bar.length - 1, false) && (startBar += searchDir);

  //   let searchIndex = startBar;

  //   while (startBar !== stopBar) {
  //     Bar[startBar].low < Bar[searchIndex].low && (searchIndex = startBar);
  //     startBar += searchDir;
  //   }

  //   return Bar[searchIndex];
  // }

  //+--------------------------------------------------------------------------------------+
  //| Main Update loop; processes bar, sma, fractal, events                                |
  //+--------------------------------------------------------------------------------------+
  const Update = async (message: IMessage) => {
    const limit: number = 100; //-- derived from timestamp
    const candles: Array<Partial<ICandle>> = await Candle.Fetch(props, limit);

    process.send && process.send(message);
  };

  //+------------------------------------------------------------------+
  //| PublishBar - Wraps up Bar processing                             |
  //+------------------------------------------------------------------+
  function PublishBar(candle: Partial<ICandle>) {
    //--- set Bias
    if (Bar.open !== candle.close!) {
      Bar.bias !== bias(direction(candle.close! - Bar.open!)) && event.setEvent(Event.NewBias, Alert.Notify);
      Bar.bias = bias(direction(candle.close! - Bar.open!));
    }

    if (Bar.low! > candle.low!) {
      event.setEvent(Event.NewLow, Alert.Notify);
      event.setEvent(Event.NewBoundary, Alert.Notify);
    }

    if (Bar.high! < candle.high!) {
      event.setEvent(Event.NewHigh, Alert.Notify);
      event.setEvent(Event.NewBoundary, Alert.Notify);
    }

    if (event.isEventActive(Event.NewBoundary)) {
      //--- set Lead
      if (Bar.low! > candle.low! && Bar.high! < candle.high!) {
        event.setEvent(Event.NewOutsideBar, Alert.Nominal);
      } else {
        if (Bar.low! > candle.low!) {
          Bar.lead !== Bias.Short && event.setEvent(Event.NewLead, Alert.Nominal);
          Bar.lead = Bias.Short;

          event.setEvent(Event.NewLow, Alert.Nominal);
          event.setEvent(Event.NewBoundary, Alert.Nominal);
        }

        if (Bar.high! < candle.high!) {
          Bar.lead !== Bias.Long && event.setEvent(Event.NewLead, Alert.Nominal);
          Bar.lead = Bias.Long;

          event.setEvent(Event.NewHigh, Alert.Nominal);
          event.setEvent(Event.NewBoundary, Alert.Nominal);
        }
      }

      //--- set Direction
      if (bar.min > candle.low! && bar.max < candle.high!) {
        event.setEvent(Event.NewOutsideBar, Alert.Minor);
      } else {
        if (bar.min > candle.low!) {
          Bar.direction !== Direction.Down && event.setEvent(Event.NewDirection, Alert.Minor);
          Bar.direction = Direction.Down;

          event.setEvent(Event.NewBoundary, Alert.Minor);
        }

        if (bar.max < candle.high!) {
          Bar.direction !== Direction.Up && event.setEvent(Event.NewDirection, Alert.Minor);
          Bar.direction = Direction.Up;

          event.setEvent(Event.NewBoundary, Alert.Minor);
        }
      }
    }

    candle.completed! && event.setEvent(Event.NewBar);

    event.isEventActive(Event.NewBar) && (timestamp = candle.timestamp!);
    event.isEventActive(Event.NewLead) && Bar.lead === Bias.Long
      ? ((bar.min = bar.retrace), (bar.retrace = candle.high!))
      : ((bar.max = bar.retrace), (bar.retrace = candle.low!));
    event.isEventActive(Event.NewHigh) && Bar.direction === Direction.Up && ((bar.retrace = candle.high!), (bar.max = candle.high!));
    event.isEventActive(Event.NewLow) && Bar.direction === Direction.Down && ((bar.retrace = candle.low!), (bar.min = candle.low!));

    Bar.timestamp = candle.timestamp;
    Bar.open = candle.open;
    Bar.high = candle.high;
    Bar.low = candle.low;
    Bar.close = candle.close;
  }

  //+------------------------------------------------------------------+
  //| PublishSMA - Computes SMA measures, trend detail, values         |
  //+------------------------------------------------------------------+
  function PublishSMA() {
    if (event.isEventActive(Event.NewBar)) {
      sma.open += Bar.open!;
      sma.close += Bar.close!;

      price.push({ open: Bar.open!, high: Bar.high!, low: Bar.low!, close: Bar.close! });

      if (price.length > periods) {
        sma.open -= price[0].open;
        sma.close -= price[0].close;
        price.shift();
      }

      SMA.timestamp = Bar.timestamp;
      SMA.open = format(sma.open / Math.min(periods, price.length), digits + 1);
      SMA.close = format(sma.close / Math.min(periods, price.length), digits + 1);
    } else {
      SMA.close = format((sma.close - SMA.close! + Bar.close!) / Math.min(periods, price.length), digits + 1);
    }

    SMA.direction = Direction.None;
    SMA.lead = Bias.None;
    SMA.bias = Bias.None;
    SMA.high = 0;
    SMA.low = 0;
  }

  // //+------------------------------------------------------------------+
  // //| setFibonacci - Calculate fibonacci sequence%'s on active Fractal |
  // //+------------------------------------------------------------------+
  // function setFibonacci(): IFibonacci {
  //   const recovery: number = Fractal.point.Recovery.timestamp > 0 ? Fractal.point.Recovery.price : Fractal.point.Retrace.price;
  //   return {
  //     retrace: {
  //       min: parseFloat((1 - (Fractal.point.Root.price - recovery) / (Fractal.point.Root.price - Fractal.point.Expansion.price)).toFixed(3)),
  //       max: parseFloat((1 - (Fractal.point.Root.price - Fractal.point.Retrace.price) / (Fractal.point.Root.price - Fractal.point.Expansion.price)).toFixed(3)),
  //       now: parseFloat((1 - (Fractal.point.Root.price - Bar[0].close) / (Fractal.point.Root.price - Fractal.point.Expansion.price)).toFixed(3)),
  //     },
  //     extension: {
  //       min: parseFloat(((Fractal.point.Root.price - Fractal.point.Retrace.price) / (Fractal.point.Root.price - Fractal.point.Base.price)).toFixed(3)),
  //       max: parseFloat(((Fractal.point.Root.price - Fractal.point.Expansion.price) / (Fractal.point.Root.price - Fractal.point.Base.price)).toFixed(3)),
  //       now: parseFloat(((Fractal.point.Root.price - Bar[0].close) / (Fractal.point.Root.price - Fractal.point.Base.price)).toFixed(3)),
  //     },
  //   };
  // }

  // //+------------------------------------------------------------------+
  // //| setFractal - Instantiates/Initializes new IFractal(obj)          |
  // //+------------------------------------------------------------------+
  // const setFractal = () => {
  //   if (fractal.minTime === fractal.maxTime) console.log("Outside Reversal handler");
  //   else if (fractal.minTime > fractal.maxTime) {
  //     const base: IBar = iLowest(fractal.maxTime);
  //     const retrace: IBar = iHighest(fractal.minTime, Bar[0].timestamp, false);
  //     const recovery: IBar = iLowest(retrace.timestamp, Bar[0].timestamp, false);

  //     Fractal.direction = Direction.Down;
  //     Fractal.point.Origin = { timestamp: fractal.maxTime, price: fractal.max };
  //     Fractal.point.Base = { timestamp: base.timestamp, price: Math.min(base.low, SMA[0].close) };
  //     Fractal.point.Root = { timestamp: fractal.maxTime, price: fractal.max };
  //     Fractal.point.Expansion = { timestamp: fractal.minTime, price: fractal.min };
  //     Fractal.point.Retrace = { timestamp: retrace.timestamp, price: retrace.timestamp > fractal.minTime ? retrace.high : retrace.close };
  //     Fractal.point.Recovery = {
  //       timestamp: recovery.timestamp > retrace.timestamp ? recovery.timestamp : 0,
  //       price: recovery.timestamp > retrace.timestamp ? recovery.low : 0,
  //     };
  //   } else {
  //     const base: IBar = iHighest(fractal.minTime);
  //     const retrace: IBar = iLowest(fractal.maxTime, Bar[0].timestamp, false);
  //     const recovery: IBar = iHighest(retrace.timestamp, Bar[0].timestamp, false);

  //     Fractal.direction = Direction.Up;
  //     Fractal.point.Origin = { timestamp: fractal.minTime, price: fractal.min };
  //     Fractal.point.Base = { timestamp: base.timestamp, price: Math.max(base.high, SMA[0].close) };
  //     Fractal.point.Root = { timestamp: fractal.minTime, price: fractal.min };
  //     Fractal.point.Expansion = { timestamp: fractal.maxTime, price: fractal.max };
  //     Fractal.point.Retrace = { timestamp: retrace.timestamp, price: retrace.timestamp > fractal.maxTime ? retrace.low : retrace.close };
  //     Fractal.point.Recovery = {
  //       timestamp: recovery.timestamp > retrace.timestamp ? recovery.timestamp : 0,
  //       price: recovery.timestamp > retrace.timestamp ? recovery.high : 0,
  //     };
  //   }
  // };

  // //+------------------------------------------------------------------+
  // //| PublishFractal - completes fractal calcs                         |
  // //+------------------------------------------------------------------+
  // function PublishFractal(row: number) {
  //   //-- Handle Fractal events
  //   if (Bar[0].high > fractal.max) {
  //     fractal.max = Bar[0].high;
  //     fractal.maxTime = Bar[0].timestamp;

  //     event.setEvent(Event.NewHigh, Alert.Minor);
  //   }

  //   if (Bar[0].low < fractal.min) {
  //     fractal.min = Bar[0].low;
  //     fractal.minTime = Bar[0].timestamp;

  //     event.setEvent(Event.NewLow, Alert.Minor);
  //   }

  //   if (row + 1 >= periods) {
  //     if (row + 1 === periods) setFractal();
  //   }

  //   console.log(Fractal, setFibonacci());
  // }

  //-- initialization Section --------------------------------------------------------------//

  Object.assign(Bar, {
    timestamp: start.timestamp!,
    direction: direction(start.close! - start.open!),
    lead: bias(direction(start.close! - start.open!)),
    bias: bias(direction(start.close! - start.open!)),
    open: start.open!,
    high: start.high!,
    low: start.low!,
    close: start.close!,
  });

  candles
    .slice()
    .reverse()
    .forEach((candle, id) => {
      event.clearEvents();

      PublishBar(candle);
      PublishSMA();
      //      PublishFractal(bar);
    });

  return { Update, activeEvents: event.activeEvents, isAnyEventActive: event.isAnyEventActive };
};
