//+------------------------------------------------------------------+
//|                                                       process.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { COrder } from "@class/order";
import { TradeState } from "@db/interfaces/instrument";

import type { ICandle } from "@db/interfaces/candle";
import type { IBar } from "@class/fractal";

import * as Instrument from "@db/interfaces/instrument";
import * as Candle from "@db/interfaces/candle";
import { bias, direction } from "@/lib/std.util";

const Order: Array<COrder> = [];

//+------------------------------------------------------------------+
//| Init - Instantiates order classes for each open trade instrument |
//+------------------------------------------------------------------+
export async function Init() {
  const instruments = await Instrument.FetchState(TradeState.Enabled);

  instruments.forEach(async (instrument) => {
    const [candle]: Array<Partial<ICandle>> = await Candle.FetchFirst(instrument.instrument!, instrument.trade_period!);
    const bar: IBar = {
      time: candle.time!,
      direction: direction(candle.close! - candle.open!),
      lead: bias(direction(candle.close! - candle.open!)),
      bias: bias(direction(candle.close! - candle.open!)),
      open: candle.open!,
      high: candle.high!,
      low: candle.low!,
      close: candle.close!,
      volume: candle.volume!,
    };
    const order: COrder = new COrder(instrument, bar);
    Order.push(order);
  });
}

//+------------------------------------------------------------------+
//| Process - Main processor; processes incoming ticks               |
//+------------------------------------------------------------------+
export async function Process() {
  await Init();

  Order.forEach((order) => {
    order.update();
  });
}
