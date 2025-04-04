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
//| CMain - Master Processing Instantiator/Monitor Class for Enabled Instruments;     |
//+--------------------------------------------------------------------------------------+
export class CMain {
  //+------------------------------------------------------------------------------------+
  //| Process - main procedure loop; handles parent/child ipc calls                      |
  //+------------------------------------------------------------------------------------+
  Process(message: IMessage) {
    console.log("checking...");
    if (message.state === "ready") {
      process.send && process.send({ ...message, state: "api" });
    }
  }

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start() {
    //    const start:Array<Partial<IInstrumentPeriod>> = await InstrumentPeriod.Fetch({ symbol: "XRP", state: State.Enabled });
    const instruments: Array<Partial<IInstrumentPeriod>> = await InstrumentPeriod.Fetch({ state: State.Enabled });

    instruments.forEach((instrument, id) => {
      const ipc = clear({ state: "start", symbol: instrument.symbol!, node: id });
      const app = fork("./app/process.ts", [JSON.stringify(ipc)]);

      app.on("message", (message: IMessage) => {
        if (message.state === "init") {
          console.log(`2:[app] Symbol ready PID: [${process.pid}:${app.pid}]`, message);
        }
        if (message.state === "api") {
          console.log("In API");
        }
        if (message.state === "ready") {
          Object.assign(ipc, clear({ ...message, state: "ready" }));
          console.log(`3:[app] Symbol ready PID: [${process.pid}:${app.pid}]`, message);
        }
      });
      app.on("exit", (code) => {
        console.log(`4:[app] Symbol exit PID: [${process.pid}:${app.pid}]:  on code ${code}`);
        process.disconnect();
      });

      console.log(`1:[app] Symbol process PID: [${process.pid}:${app.pid}]`, ipc);
      setInterval(
        () => {
          this.Process(ipc);
        },
        3000,
        ipc
      );
    });
  }
}
