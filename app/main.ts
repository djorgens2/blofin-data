//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "@lib/app.util";
import type { IInstrumentPeriod } from "@db/interfaces/instrument_period";
import type { IAccount } from "@db/interfaces/account";

import { openWebSocket } from "@module/websocket";
import { fork } from "child_process";
import { clear } from "@lib/app.util";
import { Status } from "@db/interfaces/state";

import * as InstrumentPeriods from "@db/interfaces/instrument_period";
import * as Accounts from "@db/interfaces/account";

//const ws = openWebSocket("wss://demo-trading-openapi.blofin.com/ws/private");
//const ws = openWebSocket("wss://openapi.blofin.com/ws/private");

//+--------------------------------------------------------------------------------------+
//| CMain - Master Processing Instantiator/Monitor Class for Enabled Instruments;        |
//+--------------------------------------------------------------------------------------+
export class CMain {
  async setService(service: string) {
    const keys: Array<Partial<IAccount>> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
    const props = keys.find(({ alias }) => alias === service);
    const account = await Accounts.Key(props!);

    return account ? openWebSocket({ ...props!, account }) : undefined;
  }

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start(service: string) {
    //       const instruments: Array<Partial<IInstrumentPeriod>> = await InstrumentPeriod.Fetch({ symbol: "XRP", state: State.Enabled });
    const instruments: Array<Partial<IInstrumentPeriod>> = await InstrumentPeriods.Fetch({ trade_status: Status.Enabled });
    const wss = await this.setService(service);

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
      // console.log('ping');
      if (wss && wss.readyState === WebSocket.OPEN) {
        wss.send("ping");
      }
      // if (ipc.state === "ready") {
      //   Object.assign(ipc, { ...ipc, state: "api" });
      //   app.send(ipc);
      // }
    }, 29000);
  }
}
