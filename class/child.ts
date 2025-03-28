//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { COrder } from "@class/order";
import { CFractal } from "@class/fractal";
import { State } from "@db/interfaces/trade_state";

import type { IInstrumentPeriod } from "@db/interfaces/instrument_period";
import type { IInstrument } from "@db/interfaces/instrument";
import type { ICandle } from "@db/interfaces/candle";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";
import * as Instrument from "@db/interfaces/instrument";
import * as Candle from "@db/interfaces/candle";

//+--------------------------------------------------------------------------------------+
//| CChild - Order Processing Class/Container                                            |
//+--------------------------------------------------------------------------------------+
export class CChild {
  private Order: Array<COrder> = [];
  private Fractal: Array<CFractal> = [];
}

interface IRequest {
  type: string;
  data: IInstrumentPeriod;
}

interface IResult {
    symbol: string | string[]
    status: string;
    data: number;
    error: string;
}
const app = [];

//+------------------------------------------------------------------------------------+
//| Handle instrument start                                                            |
//+------------------------------------------------------------------------------------+
process.on("message", async (message:IRequest) => {
  const result:IResult = { symbol: "", status: "", data: 0, error: "" };

  if (message.type === "init") {

    const instrument:IInstrumentPeriod = message.data;
    console.log("In Child: Recieved: ",instrument);
    const [fractal] = await Instrument.Fetch({symbol: instrument.symbol});
    const props: Candle.IKeyProps = {
        instrument: fractal.instrument!,
        period: fractal.trade_period!,
        symbol: fractal.symbol!,
        timeframe: instrument.timeframe!,
      };
      console.log("fractal;",fractal, "props:",props)
    const candles: Array<Partial<ICandle>> = await Candle.Fetch(props, 10);
    const appclass = new CFractal(fractal,candles);
    app.push(appclass);

    result.symbol = instrument.symbol!;
    result.status = "ok";
  }

  if (message.type === 'update') {
    console.log("classes loaded: ", app.length)
  }
  if (typeof process.send !== "undefined") {
    process.send(result);
  }
});
