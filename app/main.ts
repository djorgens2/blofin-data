//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "lib/app.util";
import type { ISession } from "module/session";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { openWebSocket, Session } from "module/session";
import { fork } from "child_process";
import { clear } from "lib/app.util";
import { Distinct } from "db/query.utils";

import * as Accounts from "db/interfaces/account";

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

    const authorized: Array<Partial<IInstrumentPosition>> = await Distinct<IInstrumentPosition>(
      { account: Session().account, auto_status: "Enabled", symbol: undefined },
      { table: `vw_instrument_positions`, keys: [{ key: `account` }, { key: `auto_status` }] }
    );

    if (authorized.length)
      for (const instrument of authorized) {
        const ipc = clear({ state: "init", symbol: instrument.symbol! });
        const app = fork("./app/process.ts", [JSON.stringify(ipc)]);

        app.on("message", (message: IMessage) => {
          message.state === "init" && app.send({ ...message, state: "api" });
          message.state === "api" && app.send({ ...message, state: "update" });
          message.state === "update" && Object.assign(ipc, clear({ ...message, state: "ready" }));
        });

        app.on("exit", (code) => {
          console.log(`[main] Symbol: [${ipc.symbol}] exit; PID: [${process.pid}:${app.pid}] with code ${code}`);
        });
      }

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
