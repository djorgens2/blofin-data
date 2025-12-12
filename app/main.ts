//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IMessage } from "lib/app.util";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { openWebSocket, Session } from "module/session";
import { fork, ChildProcess } from "child_process";
import { clear } from "lib/app.util";
import { Distinct } from "db/query.utils";

// Define a structure to keep track of running processes
interface ProcessMonitor {
  app: ChildProcess;
  instrument: Partial<IInstrumentPosition>;
  retries: number;
}

//+--------------------------------------------------------------------------------------+
//| CMain - Master Processing Instantiator/Monitor Class for Enabled Instruments;        |
//+--------------------------------------------------------------------------------------+
export class CMain {
  retries: number = 0;

  private activeProcesses = new Map<string, ProcessMonitor>();
  private accountDetails: any; // Store account details here

  //+--------------------------------------------------------------------------------------+
  //| Configures wss service to receive broker push notifications;                         |
  //+--------------------------------------------------------------------------------------+
  private async setService() {
    return Session().account ? openWebSocket() : undefined;
  }

  // +------------------------------------------------------------------------------------+
  // | Dedicated function to spawn and monitor individual symbol processes                |
  // +------------------------------------------------------------------------------------+
  private spawnProcess(instrument_position: Partial<IInstrumentPosition>, currentRetries: number = 0) {
    if (instrument_position.symbol && instrument_position.timeframe) {
      const { symbol, timeframe } = instrument_position;
      const ipc = clear({ state: "init", account: Session().account!, symbol, timeframe });
      const message = JSON.stringify(ipc);
      const app = fork("./app/process.ts", [message]);

      this.activeProcesses.set(symbol, { app, instrument: instrument_position, retries: currentRetries });

      app.on("message", (message: IMessage) => {
        if (message.state === "init") app.send({ ...message, state: "api" });
        else if (message.state === "api") app.send({ ...message, state: "update" });
        else if (message.state === "update") Object.assign(ipc, clear({ ...message, state: "ready" }));
      });

      app.on("exit", (code, signal) => {
        console.log(`[Info] App.Main: Symbol [${symbol}] exited with code ${code} and signal ${signal}. PID: [${app.pid}]`);

        //-- Remove the dead process from active tracking
        this.activeProcesses.delete(symbol);

        // --- Respawn Logic ---
        const maxRetries = 5; // Define your maximum retry limit, set from AppConfig??
        if (code !== 0 && currentRetries < maxRetries) {
          const nextRetry = currentRetries + 1;
          console.log(`[Warning] App.Main: Attempting restart for [${symbol}] (Retry ${nextRetry}/${maxRetries})...`);
          setTimeout(() => this.spawnProcess(instrument_position, nextRetry), 2000 * nextRetry);
        } else if (code !== 0) {
          console.error(`[Error] App.Main: Failed to restart [${symbol}] after ${maxRetries} attempts. Giving up.`);
        }
      });

      console.log(`[Info] App.Main: ${symbol} process spawned; PID [${app.pid}]`);
    }
  }

  //+------------------------------------------------------------------------------------+
  //| Start - Loads order class array, syncs bar history, processes orders               |
  //+------------------------------------------------------------------------------------+
  async Start() {
    let wss = await this.setService();

    const authorized: Array<Partial<IInstrumentPosition>> = await Distinct<IInstrumentPosition>(
      { account: Session().account, auto_status: "Enabled", symbol: undefined, timeframe: undefined },
      { table: `vw_instrument_positions`, keys: [{ key: `account` }, { key: `auto_status` }] }
    );

    this.accountDetails = Session().account; // Make account details available to the respawn logic

    //-- Initialize and spawn opening processes
    if (authorized.length) {
      for (const instrument of authorized) {
        if (instrument.symbol) {
          this.spawnProcess(instrument);
        }
      }
    }

    //-- WSS interval ping check; action on receipt of `pong`
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
            wss = await this.setService();
            break;
          }
        }
      }
    }, 29000);
  }
}
