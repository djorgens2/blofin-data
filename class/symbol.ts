//+--------------------------------------------------------------------------------------+
//|                                                                            symbol.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "@lib/std.util";
import type { IInstrument } from "@db/interfaces/instrument";
import type { ICandle } from "@db/interfaces/candle";

import { COrder } from "@class/order";
import { CFractal } from "@class/fractal";

import { State } from "@db/interfaces/trade_state";
import * as Instrument from "@db/interfaces/instrument";
import * as Candle from "@db/interfaces/candle";

//+--------------------------------------------------------------------------------------+
//| Parent instrument container containing Fracal/Order Class data for live trading;     |
//+--------------------------------------------------------------------------------------+
export class CInstrument {
  private Order: Array<COrder> = [];
  private Fractal: Array<CFractal> = [];
}

//+------------------------------------------------------------------------------------+
//| Handle instrument start                                                            |
//+------------------------------------------------------------------------------------+
process.on("message", async (message: IMessage) => {
  console.log(message);
  if (message.state === "init") {
    const [instrument] = await Instrument.Fetch({ symbol: message.symbol });
    const props: Candle.IKeyProps = {
      instrument: instrument.instrument!,
      period: instrument.trade_period!,
      symbol: instrument.symbol!,
      timeframe: instrument.trade_timeframe!,
    };
    const candles: Array<Partial<ICandle>> = await Candle.Fetch(props, 10);
    const appclass = new CFractal(instrument, candles);

    message.state = "ready";
    message.success = true;
    message.text = "ok";
    message.db = { ...message.db, fetched: candles.length! };
  }

  if (message.state === "ready") {
    //console.log("classes loaded: ", app.length);
    // do something
  }
  
  process.send && process.send(message);
});

//console.log("we made it...", parser(process.argv[2]));

// const [cli_subject] = process.argv.slice(2);
// const [cli_props] = process.argv.slice(3);
// const [cli_extended_props] = process.argv.slice(4);

//console.log('1:',cli_subject,'2:',cli_props,'3:',cli_extended_props);

// interface ITitle {
//   title: string;
// }
// function printProps(title: string, props: string, extProps: string) {
//   title && console.log(parser<ITitle>(title));
//   props && console.log(parser(props));
//   extProps && console.log(parser(extProps));
//  console.log(title);
//  console.log(props);
//  console.log(extProps);
// }

// printProps(cli_subject, cli_props, cli_extended_props);
