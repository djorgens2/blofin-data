//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "@lib/app.util";
import type { ISession } from "@module/session";

import { openWebSocket, Session } from "@module/session";
import { fork } from "child_process";
import { clear } from "@lib/app.util";

import * as InstrumentPositions from "@db/interfaces/instrument_position";
import * as Accounts from "@db/interfaces/account";

//+--------------------------------------------------------------------------------------+
//| CMain - Master Processing Instantiator/Monitor Class for Enabled Instruments;        |
//+--------------------------------------------------------------------------------------+
export class CMain {
  retries: number = 0;

  async setService(service: string) {
    const keys: Array<Partial<ISession>> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
    const props = keys.find(({ alias }) => alias === service);
    const account = await Accounts.Key(props!);

    return account ? openWebSocket({ ...props!, account }) : undefined;
  }

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start(service: string) {
    let wss = await this.setService(service);
    
    const instruments = await InstrumentPositions.Authorized({ account: Session().account, auto_status: "Enabled" });

    instruments &&
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
            this.retries = 0;
            break;
          }
          case WebSocket.CONNECTING: {
            console.log(`Websocket connecting; attempt #: [ ${++this.retries} ]`);
            this.retries > 2 && wss.close(1002, "Endpoint received malformed frame; socket closed.");
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
