//+--------------------------------------------------------------------------------------+
//|                                                                               app.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ChildProcess } from "child_process";
import type { IInstrumentPeriod } from "@/db/interfaces/instrument_period";
import type { IMessage } from "@/lib/std.util";

import { clear } from "@/lib/std.util";
import { fork } from "child_process";
import { State } from "@db/interfaces/trade_state";

import * as Periods from "@db/interfaces/instrument_period";

//+--------------------------------------------------------------------------------------+
//| CProcess - Master Processing Instantiator/Monitor Class for Enabled Instruments;     |
//+--------------------------------------------------------------------------------------+
export class CApp {
  private process: Array<ChildProcess> = [];
  private instrument: Array<Partial<IInstrumentPeriod>> = [];
  private message: Array<IMessage> = [];

  //+------------------------------------------------------------------------------------+
  //| Process - execute the main procedure stack;                                        |
  //+------------------------------------------------------------------------------------+
  async Process() {
    this.message.forEach((item, id) => {
      console.log("inside the processStack with ", item);
    });
  }

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start() {
    const start: Array<Partial<IInstrumentPeriod>> = await Periods.Fetch({ symbol: "XRP-USDT", state: State.Enabled });

    start.forEach((instrument, id) => {
      const message = clear({ state: "ready", symbol: instrument.symbol!, node: id });

      //--- Process setup
      this.instrument.push(instrument);
      this.message.push(message);
      this.process.push(fork("./class/symbol.ts", [`{"symbol":"${message.symbol}"}`]));

      //-- Message area
      this.process[id].send({ ...message, state: "init" });
      this.process[id].on("message", async (message: IMessage) => {
        try {
          if (this.message[message.node].symbol === message.symbol) {
            if (message.state === "ready") {
              Object.assign(this.message[message.node], clear(message));
            }

            if (message.state === "test") {
              console.log("next steps");
            }
          }
        } catch (e) {
          console.log("Yeow mayo!");
        }
      });
      this.process[id].on("exit", (code) => {
        console.log(`Child process ${this.process[id].pid} exited with code ${code}`);
      });
    });

    setInterval(() => {
      this.Process();
    }, 3000);
  }
}

// this.process[id].send({ state "update" });
// console.log(`Child process PID: ${this.process[id].pid}`);
