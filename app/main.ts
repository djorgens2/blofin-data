//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "@lib/std.util";
import type { IInstrumentPeriod } from "@/db/interfaces/instrument_period";

import { fork } from "child_process";
import { clear, parseJSON } from "@lib/std.util";
import { State } from "@db/interfaces/trade_state";

import * as InstrumentPeriod from "@db/interfaces/instrument_period";
import { openWebSocket } from "@/module/websocket";

//const ws = openWebSocket("wss://demo-trading-openapi.blofin.com/ws/private");
const ws = openWebSocket("wss://openapi.blofin.com/ws/private");
//connectWebSocket("wss://openapi.blofin.com/ws/private");

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
        message.state === "init" && app.send({ ...message, state: "api" });
        message.state === "api" && app.send({ ...message, state: "update" });
        message.state === "update" && Object.assign(ipc, clear({ ...message, state: "ready" }));
      });
      app.on("exit", (code) => {
        console.log(`[main] Symbol: [${ipc.symbol}] exit; PID: [${process.pid}:${app.pid}] with code ${code}`);
      });
    });

    setInterval(() => {
      console.log('ping');
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('ping')

      }
      // if (ipc.state === "ready") {
      //   Object.assign(ipc, { ...ipc, state: "api" });
      //   app.send(ipc);
      // }
    }, 10000);
  }
}
