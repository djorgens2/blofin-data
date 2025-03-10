//+------------------------------------------------------------------+
//|                                                       process.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { COrder } from "@class/order";
import { TradeState } from "@db/interfaces/instrument";

import type { IInstrumentPeriod } from "@db/interfaces/instrument_period";
import type { ICandle } from "@db/interfaces/candle";
import type { IBar } from "@class/fractal";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";
import * as Candle from "@db/interfaces/candle";
import * as Candles from "@api/candles"

export class CProcess {
  #Order: Array<COrder> = [];

  //+-----------------------------------------------------------------------+
  //| LoadOrderArray - creates order classes by pair, loads array           |
  //+-----------------------------------------------------------------------+
  async LoadOrderArray(instrument: Partial<IInstrumentPeriod>, candle: Partial<ICandle>) {
    const bar: IBar = {
      time: candle.start_time!,
      open: candle.open!,
      high: candle.high!,
      low: candle.low!,
      close: candle.close!,
      volume: candle.volume!,
      completed: candle.completed!,
    };
    const order: COrder = new COrder(instrument, bar);
    this.#Order.unshift(order);
  }

  //+-----------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders  |
  //+-----------------------------------------------------------------------+
  async Start() {
    const instruments = await InstrumentPeriod.FetchState(TradeState.Enabled);

    instruments.forEach(async (instrument, row) => {
      await Candles.IntervalImport(instrument!);
      const [candle]: Array<Partial<ICandle>> = await Candle.FetchFirst(instrument.instrument!, instrument.trade_period!);
      await this.LoadOrderArray(instrument, candle);

      this.#Order.forEach(async (order)=>{
        await Candles.IntervalImport(instrument!);
        order.Process();
      })
    });
  }
}
