//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { fork } from "child_process";
import { State } from "@db/interfaces/trade_state";
import { hexString } from "@/lib/std.util";

import type { IInstrumentPeriod } from "@/db/interfaces/instrument_period";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";

//+--------------------------------------------------------------------------------------+
//| CProcess - Master Processing Instantiator/Monitor Class for Enabled Instruments;     |
//+--------------------------------------------------------------------------------------+
export class CProcess {

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start() {
    const start:Array<Partial<IInstrumentPeriod>> = await InstrumentPeriod.Fetch({ symbol: "XRP", state: State.Enabled });

    start.forEach((instrument) => {
      const title:string = '{"title":"this is a test..."}';
      const props:string = `{"instrument":"${hexString(instrument.instrument!,6)}",`+
                           `"symbol":"${instrument.symbol!}",`+
                           `"period":"${hexString(instrument.period!,6)}",`+
                           `"timeframe":"${instrument.timeframe!}"}`;
      const extProps:string = JSON.stringify(instrument);
      
      console.log('sent:', instrument, props)
      const child = fork("./class/instrument.ts", [title, props, extProps]);
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