//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "lib/app.util";

import { CFractal } from "module/fractal";
import { Session, config } from "module/session";
import { parseJSON } from "lib/std.util";
import { hexify } from "lib/crypto.util";

import * as CandleAPI from "api/candles";
import * as InstrumentPosition from "db/interfaces/instrument_position";

//+--------------------------------------------------------------------------------------+
//| Process - Main processing loop for updating/monitoring enabled instruments;          |
//+--------------------------------------------------------------------------------------+
export const Process = async () => {
  const [cli_message] = process.argv.slice(2);
  const message: Partial<IMessage> = parseJSON<IMessage>(cli_message) ?? {};

  message.account && await config({account: hexify(message.account)});

  const instrument_position = await InstrumentPosition.Fetch({
    account: Session().account,
    symbol: message.symbol,
    timeframe: message.timeframe,
  });

  if (instrument_position && process.send) {
    const [current] = instrument_position;
    const Fractal = await CFractal(message, current);

    process.on("message", async (message: IMessage) => {
      try {
        if (message.state === `api`) {
          await CandleAPI.Publish(message);
        } else if (message.state === `update`) {
          await Fractal.Update(message);
        }
        process.send && process.send(message);
      } catch (error) {
        console.error(`Error processing message state [${message.state}]:`, error);
        process.send && process.send({ ...message, state: "error" });
      }
    });

    process.on("exit", (code) => {
      console.log(`[process]  Symbol: [${message!.symbol}] exit; PID: ${process.pid} exited with code ${code}`);
    });

    process.send(message);
  } else console.error("Missing critical instrument position data.");
};

const thread = Process();
