//+------------------------------------------------------------------+
//|                                                       process.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { COrder } from "@class/order";
import { State } from "@db/interfaces/trade_state";

import type { IInstrumentPeriod } from "@db/interfaces/instrument_period";
import type { IInstrument } from "@db/interfaces/instrument";
import type { ICandle } from "@db/interfaces/candle";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";
import * as Instrument from "@db/interfaces/instrument";
import * as Candle from "@db/interfaces/candle";

//+------------------------------------------------------------------------------------+
//| CProcess - Order Processing Class/Container                                        |
//+------------------------------------------------------------------------------------+
export class CProcess {
  private Orders: Array<COrder> = [];

  //+------------------------------------------------------------------------------------+
  //| Initialize - Loads order class array, bulk syncs bar history                       |
  //+------------------------------------------------------------------------------------+
  async Initialize(tradePeriod: Partial<IInstrumentPeriod>) {
    const [candle]: Array<Partial<ICandle>> = await Candle.FetchFirst(tradePeriod.instrument!, tradePeriod.period!);
    const [instrument]: Array<Partial<IInstrument>> = await Instrument.Fetch(tradePeriod.instrument!);
    const order: COrder = new COrder(instrument, candle);
    this.Orders.push(order);
  }

  //+------------------------------------------------------------------------------------+
  //| Ready - Returns true on Instrument found and ready for order processing            |
  //+------------------------------------------------------------------------------------+
  Ready(instrument: Uint8Array, period: Uint8Array): boolean {
    this.Orders.forEach((order) => {
      if (order.Exists(instrument, period)) return true;
    });
    return false;
  }

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start() {
    const tradePeriods = await InstrumentPeriod.Fetch({state: State.Enabled });

    tradePeriods.forEach((tradePeriod, order) => {
      if (this.Ready(tradePeriod.instrument!, tradePeriod.period!)) {
        //        Candles.IntervalImport(this.TradePeriod[row], this.TradePeriod[row].interval_collection_rate!);
        this.Orders[order].Process();
      } else {
        this.Initialize(tradePeriod);
      }
    });
    
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.Orders.length > 0) {
          console.log('Ive got mail!',this.Orders.length);
          resolve(`Processed: ${this.Orders.length}`);
        } else {
          reject(`Error processing orders`);
        }
      }, 500);
    });
  }
}