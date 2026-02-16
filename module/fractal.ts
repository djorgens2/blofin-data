//+--------------------------------------------------------------------------------------+
//|                                                                           fractal.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition } from "db/interfaces/instrument_position";
import type { ICandle } from "db/interfaces/candle";
import type { IMeasure, IMessage } from "lib/app.util"; //-- types

import { CEvent, Event, Alert } from "module/event";
import { Direction, Bias, directionChanged } from "lib/app.util"; //-- enums
import { bias, direction } from "lib/app.util"; //-- functions
import { isBetween, isHigher, isLower, format } from "lib/std.util";
import { UpdateReport, PublishReport, report } from "module/report";

import * as Candle from "db/interfaces/candle";

enum State {
  //----- Fractal States ----------------------------//
  NoState = "NoState", // No State Assignment
  Root = "Root", // Nominal divergence or possible reversal
  Rally = "Rally", // Advancing fractal
  Pullback = "Pullback", // Declining fractal
  Retrace = "Retrace", // Pegged retrace (>Rally||Pullack)
  Correction = "Correction", // Fractal max stress point/Market Correction
  Recovery = "Recovery", // Trend resumption post-correction
  Breakout = "Breakout", // Fractal Breakout
  Reversal = "Reversal", // Fractal Reversal
  Extension = "Extension", // Fibonacci Extension

  //----- SMA States ----------------------------//
  Flatline = "Flatline", // Horizontal Trade/Idle market
  Consolidation = "Consolidation", // Consolidating Range
  Parabolic = "Parabolic", // Parabolic Expansion
  Channel = "Channel", // Congruent Price Channel
}

enum Percent {
  Breakout = 1,
  Correction = 0.764,
  Retracement = 0.5,
  Consolidation = 0.234,
}

const fibonacci: Array<IFibonacciLevel> = [
  { level: 0, percent: 0 },
  { level: 1, percent: 0.236 },
  { level: 2, percent: 0.382 },
  { level: 3, percent: 0.5 },
  { level: 4, percent: 0.618 },
  { level: 5, percent: 0.764 },
  { level: 6, percent: 1 },
  { level: 7, percent: 1.618 },
  { level: 8, percent: 2.618 },
  { level: 9, percent: 3.618 },
  { level: 10, percent: 4.236 },
  { level: 11, percent: 8.236 },
];

export interface IPrice {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface IBar extends IPrice {
  direction: Direction;
  lead: Bias;
  bias: Bias;
}

interface IBarExtended extends IBar {
  volume: number;
  vol_currency: number;
  vol_currency_quote: number;
}

export interface IPoint {
  timestamp: number;
  price: number;
}

export interface IFractalPoint {
  origin: IPoint;
  base: IPoint;
  root: IPoint;
  expansion: IPoint;
  retrace: IPoint;
  recovery: IPoint;
  close: IPoint;
}

export interface IFractal extends IBar {
  state: State;
  range: number;
  point: IFractalPoint;
  extension: IFractalEvent;
  retrace: IFractalEvent;
  support: IPoint;
  resistance: IPoint;
}

export interface IFractalEvent extends IFibonacciLevel, IPoint {
  event: Event;
}

export interface IFibonacci {
  retrace: IMeasure;
  extension: IMeasure;
}

export interface IFibonacciLevel {
  level: number;
  percent: number;
}

const fibonacciLevel = (percent: number): IFibonacciLevel => {
  const level: IFibonacciLevel = { level: 0, percent: 0 };
  fibonacci
    .slice()
    .reverse()
    .some((seek) => {
      if (format(percent, 3) >= format(seek.percent, 3)) {
        Object.assign(level, seek);
        return true;
      }
    });
  return level;
};

const fibonacciPrice = (root: number, expansion: number, percent: number, digits: number): number => {
  return format((expansion - root) * percent + root, digits);
};

//+--------------------------------------------------------------------------------------+
//| Module CFractal                                                                      |
//+--------------------------------------------------------------------------------------+
export const CFractal = async (message: Partial<IMessage>, instrument: Partial<IInstrumentPosition>) => {
  const event = CEvent();
  const Bar: Partial<IBar> = {};
  const SMA: Partial<IBar> = {};
  const Fractal: Partial<IFractal> = {};
  const props: Partial<Candle.ICandle> = {
    instrument: instrument.instrument!,
    symbol: instrument.symbol!,
    period: instrument.period!,
    timeframe: instrument.timeframe!,
  };
  const candles = await Candle.Fetch(props, { suffix: `ORDER BY timestamp DESC LIMIT 10000` });
  //console.error("-> CFractal: candles:", { props, instrument, candles: candles?.length || 0 });
  const start: Partial<ICandle> = { ...(candles![candles!.length - 1] || 0) }; // -- oldest candle

  if (!start.timestamp) throw new Error("CFractal: Unable to initialize; no candle data");

  //-- Work variables -------------------------------------------------------//
  const bar = { min: start.low!, max: start.high!, retrace: start.close! > start.open! ? start.high! : start.low! };
  const sma = { open: 0, close: 0 };
  const price: Array<IPrice> = [];

  //-- Properties -------------------------------------------------------------------------------//
  const periods: number = instrument.sma!;
  const digits: number = instrument.digits!;

  //-- Utility functions ------------------------------------------------------------------------//

  //+--------------------------------------------------------------------------------------+
  //| lastProcessed returns the timestamp of the most recently processed completed bar;    |
  //+--------------------------------------------------------------------------------------+
  const lastProcessed = (): number => {
    return price.length > 1 ? price[price.length - 1].timestamp : 0;
  };

  //+--------------------------------------------------------------------------------------+
  //| iBar - Returns bar index for supplied timestamp                                      |
  //+--------------------------------------------------------------------------------------+
  const iBar = (time: number): number => {
    let left = 0;
    let right = price.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (price[mid].timestamp === time) return mid;

      price[mid].timestamp > time ? (left = mid + 1) : (right = mid - 1);
    }

    return -1;
  };

  //+--------------------------------------------------------------------------------------+
  //| iHigh - Returns highest IBar(obj) between provided bounds                            |
  //+--------------------------------------------------------------------------------------+
  const iHigh = (timeStart?: number, timeStop?: number, includeStart: boolean = true): IPoint => {
    let startBar = timeStart ? iBar(timeStart) : 0;
    const stopBar = timeStop ? iBar(timeStop) : price.length;
    const searchDir = direction(stopBar - startBar);

    !includeStart && isBetween(startBar, 0, price.length - 1) && (startBar += searchDir);
    let searchIndex = startBar;

    while (startBar !== stopBar) {
      price[startBar].high > price[searchIndex].high && (searchIndex = startBar);
      startBar += searchDir;
    }

    return { timestamp: price[searchIndex].timestamp, price: price[searchIndex].high };
  };

  //+--------------------------------------------------------------------------------------+
  //| iLow - Returns lowest IBar(obj) between provided bounds                              |
  //+--------------------------------------------------------------------------------------+
  const iLow = (timeStart?: number, timeStop?: number, includeStart: boolean = true): IPoint => {
    let startBar = timeStart ? iBar(timeStart) : 0;

    const stopBar = timeStop ? iBar(timeStop) : price.length;
    const searchDir = direction(stopBar - startBar);

    !includeStart && isBetween(startBar, 0, price.length - 1, false) && (startBar += searchDir);

    let searchIndex = startBar;

    while (startBar !== stopBar) {
      price[startBar].low < price[searchIndex].low && (searchIndex = startBar);
      startBar += searchDir;
    }

    return { timestamp: price[searchIndex].timestamp, price: price[searchIndex].low };
  };

  //+--------------------------------------------------------------------------------------+
  //| UpdateBar - Wraps up Bar processing                                                  |
  //+--------------------------------------------------------------------------------------+
  const UpdateBar = async (candle: Partial<ICandle>) => {
    event.clear();

    //--- set Bias
    if (Bar.open !== candle.close!) {
      Bar.bias !== bias(direction(candle.close! - Bar.open!)) && event.set(Event.NewBias, Alert.Notify);
      Bar.bias = bias(direction(candle.close! - Bar.open!));
    }

    if (Bar.low! > candle.low!) {
      event.set(Event.NewLow, Alert.Notify);
      event.set(Event.NewBoundary, Alert.Notify);
    }

    if (Bar.high! < candle.high!) {
      event.set(Event.NewHigh, Alert.Notify);
      event.set(Event.NewBoundary, Alert.Notify);
    }

    if (event.isActive(Event.NewBoundary)) {
      //--- set Lead
      if (Bar.low! > candle.low! && Bar.high! < candle.high!) {
        event.set(Event.NewOutsideBar, Alert.Nominal);
      } else {
        if (Bar.low! > candle.low!) {
          Bar.lead !== Bias.Short && event.set(Event.NewLead, Alert.Nominal);
          Bar.lead = Bias.Short;

          event.set(Event.NewLow, Alert.Nominal);
          event.set(Event.NewBoundary, Alert.Nominal);
        }

        if (Bar.high! < candle.high!) {
          Bar.lead !== Bias.Long && event.set(Event.NewLead, Alert.Nominal);
          Bar.lead = Bias.Long;

          event.set(Event.NewHigh, Alert.Nominal);
          event.set(Event.NewBoundary, Alert.Nominal);
        }
      }

      //--- set Direction
      if (bar.min > candle.low! && bar.max < candle.high!) {
        event.set(Event.NewOutsideBar, Alert.Minor);
      } else {
        if (bar.min > candle.low!) {
          Bar.direction !== Direction.Down && event.set(Event.NewDirection, Alert.Minor);
          Bar.direction = Direction.Down;

          event.set(Event.NewBoundary, Alert.Minor);
        }

        if (bar.max < candle.high!) {
          Bar.direction !== Direction.Up && event.set(Event.NewDirection, Alert.Minor);
          Bar.direction = Direction.Up;

          event.set(Event.NewBoundary, Alert.Minor);
        }
      }
    }

    candle.completed! && event.set(Event.NewBar);

    event.isActive(Event.NewBar) && (Bar.timestamp = candle.timestamp!);
    event.isActive(Event.NewLead) && Bar.lead === Bias.Long
      ? ((bar.min = bar.retrace), (bar.retrace = candle.high!))
      : ((bar.max = bar.retrace), (bar.retrace = candle.low!));
    event.isActive(Event.NewHigh) && Bar.direction === Direction.Up && (bar.retrace = bar.max = candle.high!);
    event.isActive(Event.NewLow) && Bar.direction === Direction.Down && (bar.retrace = bar.min = candle.low!);

    Bar.open = candle.open;
    Bar.high = candle.high;
    Bar.low = candle.low;
    Bar.close = candle.close;

    Object.assign(report, { bar: { timestamp: Bar.timestamp, open: Bar.open, high: Bar.high, low: Bar.low, close: Bar.close } });
  };

  //+--------------------------------------------------------------------------------------+
  //| UpdateSMA - Computes SMA measures, trend detail, values                              |
  //+--------------------------------------------------------------------------------------+
  const UpdateSMA = async () => {
    if (event.isActive(Event.NewBar)) {
      sma.open += Bar.open!;
      sma.close += Bar.close!;

      price.push({ timestamp: Bar.timestamp!, open: Bar.open!, high: Bar.high!, low: Bar.low!, close: Bar.close! });

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

    Object.assign(report, { sma: { open: SMA.open, close: SMA.close } });
  };

  //+--------------------------------------------------------------------------------------+
  //| UpdateFractal - completes fractal calcs                                              |
  //+--------------------------------------------------------------------------------------+
  const UpdateFractal = async () => {
    const resistance = iHigh();
    const support = iLow();
    const close = { timestamp: Bar.timestamp!, price: Bar.close! };
    const rangeDirection = close.price < Fractal.support!.price ? Direction.Down : close.price > Fractal.resistance!.price ? Direction.Up : Direction.None;

    //--- Handle Reversals
    if (directionChanged(Fractal.direction!, rangeDirection)) {
      Fractal.direction = rangeDirection;
      Fractal.point!.base = Fractal.direction === Direction.Up ? Fractal.resistance! : Fractal.support!;
      Fractal.point!.root = Fractal.point!.expansion;
      Fractal.point!.origin = Fractal.point!.root;

      Object.assign(report, { fractal: Fractal.point!.root });
      event.set(Event.NewReversal, Alert.Major);
    }

    //--- Check for Upper Boundary changes
    if (Fractal.direction === Direction.Up)
      if (isHigher(Bar.high!, Fractal.point!.expansion.price, digits)) {
        Fractal.extension!.price = Fractal.point!.expansion.price; // -- store prior value for fibo calc
        Fractal.point!.expansion = { timestamp: Bar.timestamp!, price: Bar.high! };
        Fractal.point!.retrace = close;
        Fractal.point!.recovery = close;

        event.set(Event.NewExpansion, Alert.Minor);
      } else if (event.isActive(Event.NewBoundary)) {
        if (event.isActive(Event.NewLow)) {
          if (Fractal.point!.retrace.price > Bar.low!) {
            Fractal.point!.retrace = { timestamp: Bar.timestamp!, price: Bar.low! };
            Fractal.point!.recovery = close;
          }
        }
        if (event.isActive(Event.NewHigh))
          Fractal.point!.recovery.price < Bar.high! && (Fractal.point!.recovery = { timestamp: Bar.timestamp!, price: Bar.high! });
      } else {
        Fractal.point!.recovery.price < Bar.close! && (Fractal.point!.recovery = close);
        Fractal.point!.retrace.price > Bar.close! && (Fractal.point!.retrace = close);
      }
    //--- Check for Lower Boundary changes
    else if (isLower(Bar.low!, Fractal.point!.expansion.price, digits)) {
      Fractal.extension!.price = Fractal.point!.expansion.price; // -- store prior value for fibo calc
      Fractal.point!.expansion = { timestamp: Bar.timestamp!, price: Bar.low! };
      Fractal.point!.retrace = close;
      Fractal.point!.recovery = close;

      event.set(Event.NewExpansion, Alert.Minor);
    } else if (event.isActive(Event.NewHigh)) {
      if (Fractal.point!.retrace.price < Bar.high!) {
        Fractal.point!.retrace = { timestamp: Bar.timestamp!, price: Bar.high! };
        Fractal.point!.recovery = close;
      }
    } else if (event.isActive(Event.NewLow))
      Fractal.point!.recovery.price > Bar.low! && (Fractal.point!.recovery = { timestamp: Bar.timestamp!, price: Bar.low! });
    else {
      Fractal.point!.recovery.price > Bar.close! && (Fractal.point!.recovery = close);
      Fractal.point!.retrace.price < Bar.close! && (Fractal.point!.retrace = close);
    }

    //-- wrap-up tasks
    isLower(resistance.price - support.price, Fractal.range!) && event.set(Event.NewConsolidation, Alert.Nominal);

    Fractal.range = format(resistance.price - support.price, digits);
    Fractal.point!.close = close;
    Fractal.support = support;
    Fractal.resistance = resistance;
  };

  //+--------------------------------------------------------------------------------------+
  //| Fibonacci - Returns Calculated fibonacci %sequence's for the active Fractal          |
  //+--------------------------------------------------------------------------------------+
  const Fibonacci = (): IFibonacci => {
    const recovery: number = Fractal.point!.recovery.timestamp > 0 ? Fractal.point!.recovery.price : Fractal.point!.retrace.price;
    return {
      retrace: {
        min: format(1 - (Fractal.point!.root.price - recovery) / (Fractal.point!.root.price - Fractal.point!.expansion.price), 3),
        max: format(1 - (Fractal.point!.root.price - Fractal.point!.retrace.price) / (Fractal.point!.root.price - Fractal.point!.expansion.price), 3),
        now: format(1 - (Fractal.point!.root.price - Bar.close!) / (Fractal.point!.root.price - Fractal.point!.expansion.price), 3),
      },
      extension: {
        min: format((Fractal.point!.root.price - Fractal.point!.retrace.price) / (Fractal.point!.root.price - Fractal.point!.base.price), 3),
        max: format((Fractal.point!.root.price - Fractal.point!.expansion.price) / (Fractal.point!.root.price - Fractal.point!.base.price), 3),
        now: format((Fractal.point!.root.price - Bar.close!) / (Fractal.point!.root.price - Fractal.point!.base.price), 3),
      },
    };
  };

  //+--------------------------------------------------------------------------------------+
  //| UpdateFibonacci - Updates Fractal state, properties, events                          |
  //+--------------------------------------------------------------------------------------+
  const UpdateFibonacci = async () => {
    const percent = Fibonacci();

    if (event.isActive(Event.NewExpansion)) {
      //-- Handle New Reversal
      if (event.isActive(Event.NewReversal)) {
        Fractal.state = State.Reversal;
        Fractal.extension = { timestamp: Bar.timestamp!, price: Fractal.point!.base.price, ...fibonacciLevel(Percent.Breakout), event: Event.NewReversal };
        Object.assign(report, { breakout: { timestamp: Bar.timestamp, price: Fractal.point!.base.price } });
      }
      //-- Handle New Breakout
      else if (Fractal.retrace!.level) {
        Fractal.state = State.Breakout;
        Fractal.extension = { ...Fractal.extension!, timestamp: Bar.timestamp!, event: Event.NewBreakout };
        Object.assign(report, { breakout: { timestamp: Bar.timestamp, price: Fractal.extension.price } });
        event.set(Event.NewBreakout, Alert.Major);
      }

      //-- Handle New Extension
      while (isHigher(fibonacciLevel(percent.extension.max).level, Fractal.extension!.level, 3)) {
        Fractal.state = State.Extension;
        Fractal.extension = {
          timestamp: Bar.timestamp!,
          price: fibonacciPrice(Fractal.point!.root.price, Fractal.point!.base.price, fibonacci[++Fractal.extension!.level].percent, digits),
          level: Fractal.extension!.level,
          percent: fibonacci[Fractal.extension!.level].percent,
          event: Event.NewExtension,
        };
        report.extension.push(Fractal.extension!);
        event.set(Event.NewExtension, Alert.Minor);
      }
      Fractal.retrace = {
        timestamp: Bar.timestamp!,
        price: Fractal.point?.expansion.price!,
        level: 0,
        percent: 0,
        event: Event.NewExtension,
      };
    }

    //-- Handle Retrace
    while (isHigher(fibonacciLevel(percent.retrace.max).level, Fractal.retrace!.level, 3)) {
      const retrace: IFractalEvent = {
        timestamp: Bar.timestamp!,
        price: fibonacciPrice(Fractal.point!.expansion.price, Fractal.point!.root.price, ++Fractal.retrace!.level, digits),
        level: Fractal.retrace!.level,
        percent: fibonacci[Fractal.retrace!.level].percent,
        event: Event.NoEvent,
      };

      if (percent.retrace.max >= Percent.Correction) {
        if (percent.retrace.min < Percent.Consolidation) {
          Fractal.state = State.Recovery;
          Fractal.retrace = {
            ...retrace,
            event: Event.NewRecovery,
          };

          event.set(Event.NewRecovery, Alert.Major);
        } else {
          Fractal.state = State.Correction;
          Fractal.retrace = {
            ...retrace,
            event: Event.NewCorrection,
          };

          event.set(Event.NewCorrection, Alert.Major);
        }
      } else if (percent.retrace.max >= Percent.Retracement) {
        Fractal.state = State.Retrace;
        Fractal.retrace = {
          ...retrace,
          event: Event.NewRetrace,
        };

        event.set(Event.NewRetrace, Alert.Minor);
      } else if (percent.retrace.max >= Percent.Consolidation) {
        Fractal.retrace = {
          ...retrace,
          event: Fractal.direction === Direction.Up ? Event.NewPullback : Event.NewRally,
        };

        event.set(Fractal.retrace!.event, Alert.Nominal);
      }
      report.retracement.push(Fractal.retrace!);
    }
  };
  //+--------------------------------------------------------------------------------------+
  //| Main Update loop; processes bar, sma, fractal, events                                |
  //+--------------------------------------------------------------------------------------+
  const Update = async (message: IMessage) => {
    const candles = await Candle.Fetch({ ...props, timestamp: lastProcessed() });

    const updating = async (candle: Partial<ICandle>) => {
      const bar = await UpdateBar(candle);
      const sma = await UpdateSMA();
      const fractal = await UpdateFractal();
      const fibonacci = await UpdateFibonacci();
      Object.assign(message, { ...message });
    };

    const processing = async () => {
      if (candles) {
        for (let candle = candles.length - 1; candle >= 0; candle--) {
          await updating(candles[candle]);
          candles[candle].completed && UpdateReport();
        }
      }
    };

    const start = async () => {
      await processing();
      event.isActive(Event.NewBar) && PublishReport("./log/" + props.symbol + ".process.log");
      process.send && process.send({ ...message, events: { fractal: event.count(), sma: 0 } });
    };

    start();
  };

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

  Object.assign(SMA, Bar);

  Object.assign(Fractal, {
    direction: Bar.direction,
    lead: Bar.lead,
    bias: Bar.bias,
    range: format(Bar.high! - Bar.low!, digits),
    state: State.Breakout,
    point: {
      origin: { timestamp: Bar.timestamp, price: format(Bar.direction! === Direction.Up ? Bar.low! : Bar.high!, digits) },
      base: { timestamp: Bar.timestamp, price: format(Bar.direction! === Direction.Up ? Bar.high! : Bar.low!, digits) },
      root: { timestamp: Bar.timestamp, price: format(Bar.direction! === Direction.Up ? Bar.low! : Bar.high!, digits) },
      expansion: { timestamp: Bar.timestamp, price: format(Bar.direction! === Direction.Up ? Bar.high! : Bar.low!, digits) },
      retrace: { timestamp: Bar.timestamp, price: format(Bar.open!, digits) },
      recovery: { timestamp: Bar.timestamp, price: format(Bar.close!, digits) },
      close: { timestamp: Bar.timestamp, price: format(Bar.close!, digits) },
    },
    extension: { event: Event.NoEvent, price: 0.0, level: 0, percent: 0.0 },
    retrace: { event: Event.NoEvent, price: 0.0, level: 0, percent: 0.0 },
    support: { timestamp: Bar.timestamp, price: format(Bar.low!, digits) },
    resistance: { timestamp: Bar.timestamp, price: format(Bar.high!, digits) },
  });

  return { Update, active: event.active, isAnyActive: event.isAnyActive };
};
