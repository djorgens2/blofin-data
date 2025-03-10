//+------------------------------------------------------------------+
//|                                                       process.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { COrder } from "@class/order";
import { TradeState } from "@db/interfaces/trade_state";

import type { IInstrumentPeriod } from "@db/interfaces/instrument_period";
import type { IInstrument } from "@db/interfaces/instrument";
import type { ICandle } from "@db/interfaces/candle";
import type { IBar } from "@class/fractal";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";
import * as Instrument from "@db/interfaces/instrument";
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
    const tradePeriods = await InstrumentPeriod.FetchState(TradeState.Enabled);

    tradePeriods.forEach(async (tradePeriod, row) => {
      await Candles.IntervalImport(tradePeriod!,tradePeriod.bulk_collection_rate!);
      const [candle]: Array<Partial<ICandle>> = await Candle.FetchFirst(tradePeriod.instrument!, tradePeriod.period!);
      const [instrument]: Array<Partial<IInstrument>> = await Instrument.Fetch(tradePeriod.instrument!)
      await this.LoadOrderArray(instrument, candle);

      this.#Order.forEach(async (order)=>{
        await Candles.IntervalImport(tradePeriod!,tradePeriod.interval_collection_rate!);
        order.Process();
      })
    });
  }
}
