//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPeriod } from "@db/interfaces/instrument_period";
import type { IMessage } from "@lib/app.util";
import type { TSession } from "@module/session";

import { openWebSocket } from "@module/session";
import { fork } from "child_process";
import { clear } from "@lib/app.util";

import * as InstrumentPeriods from "@db/interfaces/instrument_period";
import * as Accounts from "@db/interfaces/account";
import * as Orders from "@db/interfaces/order";

//+--------------------------------------------------------------------------------------+
//| CMain - Master Processing Instantiator/Monitor Class for Enabled Instruments;        |
//+--------------------------------------------------------------------------------------+
export class CMain {
  async setService(service: string) {
    const keys: Array<Partial<TSession>> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
    const props = keys.find(({ alias }) => alias === service);
    const account = await Accounts.Key(props!);

    return account ? openWebSocket({ ...props!, account }) : undefined;
  }

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start(service: string) {
    const instruments: Array<Partial<IInstrumentPeriod>> = await InstrumentPeriods.Fetch({ trade_status: "Halted" });
    let wss = await this.setService(service);

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

    setInterval(async () => {
      if (wss) {
        switch (wss.readyState) {
          case WebSocket.OPEN: {
            wss.send("ping");
            break;
          }
          case WebSocket.CONNECTING: {
            console.log("Websocket connecting...");
            break;
          }
          case WebSocket.CLOSED: {
            wss = await this.setService(service);
            break;
          }
        }
      }
    }, 29000);
  }
}
