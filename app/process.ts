//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
import type { IMessage } from "@lib/std.util";

import { CFractal } from "@class/fractal";
import { parse } from "@lib/std.util";

import * as Candles from "@api/candles";
import * as Candle from "@db/interfaces/candle";
import * as Instrument from "@db/interfaces/instrument";

//+--------------------------------------------------------------------------------------+
//| CProcess - Master Processing Instantiator/Monitor Class for Enabled Instruments;     |
//+--------------------------------------------------------------------------------------+
export const CProcess = async () => {
  const [cli_message] = process.argv.slice(2);
  const message: IMessage | undefined = parse<IMessage>(cli_message);
  const [instrument]: Array<Partial<Instrument.IInstrument>> = await Instrument.Fetch({ symbol: message!.symbol });
  const props: Candle.IKeyProps = {
    instrument: instrument.instrument!,
    symbol: instrument.symbol!,
    period: instrument.trade_period!,
    timeframe: instrument.trade_timeframe!,
  };
  const Fractal = await CFractal(instrument);
  const limit = instrument.interval_collection_rate!;

  process.on("message", (message: IMessage) => {
    console.log("process:", message);
    message.state === "init" && Candles.Import(message, props, instrument.bulk_collection_rate);
    message.state === "api" && Candles.Import(message, props, limit);
    message.state === "update" && Fractal.Update(message);
  });

  process.on("exit", (code) => {
    console.log(`3:[symbol] Symbol process PID: ${process.pid} exited with code ${code}`);
  });

  process.send && process.send(message);
};

const thread = CProcess();
