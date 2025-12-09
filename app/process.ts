//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict"

import type { IInstrumentPosition } from "db/interfaces/instrument_position";
import { clear, type IMessage } from "lib/app.util";

import { CFractal } from "module/fractal";
import { Session } from "module/session";
import { parseJSON } from "lib/std.util";

import * as CandleAPI from "api/candles";
import * as Candle from "db/interfaces/candle";
import * as InstrumentPosition from "db/interfaces/instrument_position";

//+--------------------------------------------------------------------------------------+
//| Process - Main processing loop for updating/monitoring enabled instruments;          |
//+--------------------------------------------------------------------------------------+
export const Process = async () => {
  const [cli_message] = process.argv.slice(2);
  const message = parseJSON<IMessage>(cli_message) ?? clear({ state: "init", symbol: `error` });
  const [instrument_position]: Array<Partial<IInstrumentPosition>> = (await InstrumentPosition.Fetch({ account: Session().account, symbol: message!.symbol })) ?? [];
  const props: Partial<Candle.ICandle> = {
    instrument: instrument_position.instrument!,
    symbol: instrument_position.symbol!,
    period: instrument_position.period!,
    timeframe: instrument_position.timeframe!,
  };
  const Fractal = await CFractal(message!, instrument_position);

  process.on("message", (message: IMessage) => {
    message.state === `init` && CandleAPI.Import( message, {symbol: props.symbol!, timeframe: props.timeframe!, startTime: 0});
    message.state === `api` && CandleAPI.Publish(message);
    message.state === `update` && Fractal.Update(message);
  });

  process.on("exit", (code) => {
    console.log(`[process]  Symbol: [${message!.symbol}] exit; PID: ${process.pid} exited with code ${code}`);
  });

  process.send && process.send(message);
};

const thread = Process();
