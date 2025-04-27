//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "@lib/std.util";
import type { IInstrumentPeriod } from "@/db/interfaces/instrument_period";

import { fork } from "child_process";
import { clear } from "@lib/std.util";
import { State } from "@db/interfaces/trade_state";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";

//+--------------------------------------------------------------------------------------+
//| CMain - Master Processing Instantiator/Monitor Class for Enabled Instruments;        |
//+--------------------------------------------------------------------------------------+
export class CMain {
  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start() {
    //       const instruments: Array<Partial<IInstrumentPeriod>> = await InstrumentPeriod.Fetch({ symbol: "XRP", state: State.Enabled });
    const instruments: Array<Partial<IInstrumentPeriod>> = await InstrumentPeriod.Fetch({ state: State.Enabled });

    instruments.forEach((instrument, id) => {
      const ipc = clear({ state: "init", symbol: instrument.symbol!, node: id });
      const app = fork("./app/process.ts", [JSON.stringify(ipc)]);

      app.on("message", (message: IMessage) => {
        //        console.log("main:", message);
        message.state === "init" && app.send({ ...message, state: "api" });
        message.state === "api" && app.send({ ...message, state: "update" });
        message.state === "update" && Object.assign(ipc, clear({ ...message, state: "ready" }));
      });
      app.on("exit", (code) => {
        //        console.log(`4:[app] Symbol exit PID: [${process.pid}:${app.pid}] on code ${code}`);
        app.disconnect();
      });

      setInterval(() => {
        console.log("clock:", ipc);
        if (ipc.state === "ready") {
          Object.assign(ipc, { ...ipc, state: "api" });
          app.send(ipc);
        }
      }, 1000);
    });
  }
}
