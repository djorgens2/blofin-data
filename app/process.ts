//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict"

import type { IInstrument } from "db/interfaces/instrument";
import type { IMessage } from "lib/app.util";

import { CFractal } from "module/fractal";
import { parseJSON } from "lib/std.util";

import * as Candles from "api/candles";
import * as Candle from "db/interfaces/candle";
import * as Instrument from "db/interfaces/instrument";

//+--------------------------------------------------------------------------------------+
//| CProcess - Master Processing Instantiator/Monitor Class for Enabled Instruments;     |
//+--------------------------------------------------------------------------------------+
export const CProcess = async () => {
  const [cli_message] = process.argv.slice(2);
  const message: IMessage | undefined = parseJSON<IMessage>(cli_message);
  const [instrument]: Array<Partial<IInstrument>> = (await Instrument.Fetch({ symbol: message!.symbol })) ?? [];
  const props: Partial<Candle.ICandle> = {
    instrument: instrument.instrument!,
    symbol: instrument.symbol!,
    period: instrument.trade_period!,
    timeframe: instrument.trade_timeframe!,
  };
  const Fractal = await CFractal(message!, instrument);

  process.on("message", (message: IMessage) => {
    message.state === `init` && Candles.Import(message, { ...props, limit: instrument.bulk_collection_rate });
    message.state === `api` && Candles.Import(message, { ...props, limit: instrument.interval_collection_rate });
    message.state === `update` && Fractal.Update(message);
  });

  process.on("exit", (code) => {
    console.log(`[process]  Symbol: [${message!.symbol}] exit; PID: ${process.pid} exited with code ${code}`);
  });

  process.send && process.send(message);
};

const thread = CProcess();
