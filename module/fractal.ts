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
import { Direction, Bias, directionChanged } from "@lib/app.util"; //-- enums
import { bias, direction } from "@lib/app.util"; //-- functions
import { isBetween, isEqual, isHigher, isLower, fileWrite, format } from "@lib/std.util";

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

const fibos = [
  { state: "Root", percent: 0 },
  { state: "Pullback", percent: 0.236 },
  { state: "Pullback", percent: 0.382 },
  { state: "Rally", percent: 0.236 },
  { state: "Rally", percent: 0.382 },
  { state: "Retrace", percent: 0.5 },
  { state: "Retrace", percent: 0.618 },
  { state: "Correction", percent: 0.764 },
  { state: "Breakout", percent: 1 },
  { state: "Reversal", percent: 1 },
  { state: "Extension", percent: 1.618 },
  { state: "Extension", percent: 2.618 },
  { state: "Extension", percent: 3.618 },
  { state: "Extension", percent: 4.236 },
  { state: "Extension", percent: 8.236 },
];

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
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IBar extends IPrice {
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
  origin: IPoint;
  base: IPoint;
  root: IPoint;
  expansion: IPoint;
  retrace: IPoint;
  recovery: IPoint;
  close: IPoint;
}

interface IFractal extends IBar {
  state: State;
  range: number;
  point: IFractalPoint;
  support: IPoint;
  resistance: IPoint;
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
  const report: Array<any> = [];

  //-- Work variables -------------------------------------------------------//
  const bar = { min: start.low!, max: start.high!, retrace: start.close! > start.open! ? start.high! : start.low! };
  const sma = { open: 0, close: 0 };
  const price: Array<IPrice> = [];

  //-- Properties -------------------------------------------------------------------------------//
  const periods: number = instrument.sma_factor!;
  const digits: number = instrument.digits!;

  //-- Utility functions ------------------------------------------------------------------------//

  //+--------------------------------------------------------------------------------------+
  //| iBar - Returns bar index for supplied timestamp                                      |
  //+--------------------------------------------------------------------------------------+
  function iBar(time: number): number {
    let left = 0;
    let right = price.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (price[mid].timestamp === time) return mid;

      price[mid].timestamp > time ? (left = mid + 1) : (right = mid - 1);
    }

    return -1;
  }

  //+--------------------------------------------------------------------------------------+
  //| iHigh - Returns highest IBar(obj) between provided bounds                            |
  //+--------------------------------------------------------------------------------------+
  function iHigh(timeStart?: number, timeStop?: number, includeStart: boolean = true): IPoint {
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
  }

  //+--------------------------------------------------------------------------------------+
  //| iLow - Returns lowest IBar(obj) between provided bounds                              |
  //+--------------------------------------------------------------------------------------+
  function iLow(timeStart?: number, timeStop?: number, includeStart: boolean = true): IPoint {
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
  }

  //+--------------------------------------------------------------------------------------+
  //| Main Update loop; processes bar, sma, fractal, events                                |
  //+--------------------------------------------------------------------------------------+
  const Update = async (message: IMessage) => {
    const limit: number = 100; //-- derived from timestamp
    const candles: Array<Partial<ICandle>> = await Candle.Fetch(props, limit);

    process.send && process.send(message);
  };

  //+--------------------------------------------------------------------------------------+
  //| UpdateBar - Wraps up Bar processing                                                  |
  //+--------------------------------------------------------------------------------------+
  function UpdateBar(candle: Partial<ICandle>) {
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
  }

  //+--------------------------------------------------------------------------------------+
  //| UpdateSMA - Computes SMA measures, trend detail, values                              |
  //+--------------------------------------------------------------------------------------+
  function UpdateSMA() {
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
  }

  //+--------------------------------------------------------------------------------------+
  //| Fibonacci - Returns Calculated fibonacci %sequence's for the active Fractal          |
  //+--------------------------------------------------------------------------------------+
  function Fibonacci(): IFibonacci {
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
  }

  //+--------------------------------------------------------------------------------------+
  //| UpdateFibonacci - Updates and validates Fractal state, properties, events            |
  //+--------------------------------------------------------------------------------------+
  function UpdateFibonacci() {
    const fiboanacci = Fibonacci();

    report.push([
      Bar.timestamp,
      Bar.open,
      Bar.high,
      Bar.low,
      Bar.close,
      SMA.open,
      SMA.close,
      event.isActive(Event.NewReversal) ? Fractal.point!.root.timestamp : "=na()",
      event.isActive(Event.NewReversal) ? Fractal.point?.root.price : "=na()",
    ]);

    // Extension.Event   = NoEvent;
    // Retrace.Event     = NoEvent;

    // //-- Handle Fractal Resets
    // if (Reset)
    // {
    //   //-- Reset Extension
    //   ArrayInitialize(Extension.Percent,fext(Fractal[fpBase],Fractal[fpRoot],Fractal[fpExpansion],InDecimal));
    //   Extension.Level            = Level(Extension.Percent[Max]);
    //   Extension.Price            = Fractal[fpBase];
    //   Extension.Event            = BoolToEvent(IsEqual(Fractal[fpRoot],fpoint[fpRoot]),NewBreakout,NewReversal);
    // }
    // else

    // //-- Handle Interior Fractal Calcs
    // {
    //   //-- Update Extension
    //   Extension.Percent[Now]     = fext(Fractal[fpBase],Fractal[fpRoot],Fractal[fpClose],InDecimal);
    //   Extension.Percent[Min]     = fext(Fractal[fpBase],Fractal[fpRoot],Fractal[fpRetrace],InDecimal);
    //   Extension.Percent[Max]     = fext(Fractal[fpBase],Fractal[fpRoot],Fractal[fpExpansion],InDecimal);

    //   if (IsHigher(Level(Extension.Percent[Max]),Extension.Level))
    //   {
    //     Extension.Event          = NewExtension;
    //     Extension.Price          = fprice(Fractal[fpBase],Fractal[fpRoot],Extension.Level);
    //   }

    //   //-- Handle New Extension
    //   if (IsEqual(Extension.Percent[Min],Extension.Percent[Max],3))
    //     if (Retrace.Level>FiboRoot)
    //     {
    //       Extension.Price        = BoolToDouble(IsBetween(fpoint[fpExpansion],fpoint[fpRoot],fpoint[fpBase]),Fractal[fpBase],fpoint[fpExpansion]);
    //       Extension.Event        = NewBreakout;
    //     }
    // }

    // //-- Reset Retrace
    // if (Extension.Event>NoEvent)
    // {
    //   ArrayInitialize(Retrace.Percent,0.00);
    //   Retrace.Level              = FiboRoot;
    // }
    // else

    // //-- Update Retrace
    // {
    //   FibonacciType min          = Level(Retrace.Percent[Min]);

    //   Retrace.Percent[Now]       = fret(Fractal[fpRoot],Fractal[fpExpansion],Fractal[fpClose],InDecimal);
    //   Retrace.Percent[Min]       = fret(Fractal[fpRoot],Fractal[fpExpansion],Fractal[fpRecovery],InDecimal);
    //   Retrace.Percent[Max]       = fret(Fractal[fpRoot],Fractal[fpExpansion],Fractal[fpRetrace],InDecimal);

    //   if (IsHigher(Level(Retrace.Percent[Max]),Retrace.Level))
    //   {
    //     if (IsEqual(Retrace.Level,FiboCorrection))
    //       Retrace.Event          = NewCorrection;
    //     else
    //     if (IsBetween(Retrace.Level,Fibo50,Fibo61))
    //       Retrace.Event          = NewRetrace;
    //     else
    //     if (IsBetween(Retrace.Level,Fibo23,Fibo38))
    //       Retrace.Event          = BoolToEvent(IsEqual(Direction(Fractal[fpBase]-Fractal[fpRoot]),DirectionUp),NewPullback,NewRally);

    //     Retrace.Price            = fprice(Fractal[fpRoot],Fractal[fpExpansion],Retrace.Level);
    //   }

    //   if (Retrace.Percent[Max]>fibonacci[FiboCorrection])
    //     if (IsLower(Level(Retrace.Percent[Min]),min))
    //       if (Retrace.Percent[Min]<fibonacci[Fibo23])
    //       {
    //         Retrace.Event        = NewRecovery;
    //         Retrace.Price        = fprice(Fractal[fpRoot],Fractal[fpExpansion],Fibo23);
    //       }
    // }

    // SetEvent(Extension.Event,Alert(Type),Extension.Price);
    // SetEvent(Retrace.Event,Alert(Type),Retrace.Price);
  }

  //+--------------------------------------------------------------------------------------+
  //| UpdateFractal - completes fractal calcs                                              |
  //+--------------------------------------------------------------------------------------+
  function UpdateFractal() {
    const close = { timestamp: Bar.timestamp!, price: Bar.close! };
    const resistance = iHigh();
    const support = iLow();
    const prior = structuredClone(Fractal);
    const rangeDirection = close.price < Fractal.support!.price ? Direction.Down : close.price > Fractal.resistance!.price ? Direction.Up : Direction.None;

    //--- Handle Reversals
    if (directionChanged(Fractal.direction!, rangeDirection)) {
      Fractal.direction = rangeDirection;
      Fractal.point!.base = Fractal.direction === Direction.Up ? Fractal.resistance! : Fractal.support!;
      Fractal.point!.root = Fractal.point!.expansion;
      Fractal.point!.origin = Fractal.point!.root;

      event.set(Event.NewReversal, Alert.Major);
    }

    //--- Check for Upper Boundary changes
    if (Fractal.direction === Direction.Up)
      if (isHigher(Bar.high!, Fractal.point!.expansion.price, digits)) {
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
    isLower(resistance.price - support.price, Fractal.range!) && event.set(Event.NewConsolidation, Alert.Minor);

    Fractal.range = format(resistance.price - support.price, digits);
    Fractal.point!.close = close;
    Fractal.support = support;
    Fractal.resistance = resistance;

    //if (event.isActive(Event.NewHigh) && event.isActive(Event.NewLow))
    //    console.log(event.active(), Fractal, Fibonacci());
  }

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
    support: { timestamp: Bar.timestamp, price: format(Bar.low!, digits) },
    resistance: { timestamp: Bar.timestamp, price: format(Bar.high!, digits) },
  });

  candles
    .slice()
    .reverse()
    .forEach((candle, id) => {
      event.clear();

      UpdateBar(candle);
      UpdateSMA();
      UpdateFractal();
      UpdateFibonacci();
    });

  fileWrite("ctest-reverse.log", report);

  return { Update, active: event.active, isAnyActive: event.isAnyActive };
};
