//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPeriod } from "@/db/interfaces/instrument_period";

import { fork } from "child_process";
import { State } from "@db/interfaces/trade_state";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";

//+--------------------------------------------------------------------------------------+
//| CProcess - Order Processing Class/Container                                          |
//+--------------------------------------------------------------------------------------+
export class CProcess {

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start() {
    const start:Array<Partial<IInstrumentPeriod>> = await InstrumentPeriod.Fetch({ symbol: "XRP", state: State.Enabled });

    start.forEach((instrument) => {
      console.log('sent:', instrument)
      const child = fork("./class/child.ts");
      child.send({ type: "init", data: instrument });
    
      child.send({type: 'update'});
      console.log(`Child process PID: ${child.pid}`);

      child.on("message", (message) => {
        console.log(`Report from child process ${child.pid}:`, message);
      });
    
      child.on("exit", (code) => {
        console.log(`Child process ${child.pid} exited with code ${code}`);
      });
     })    
  }
}