/**
 * @file main.ts
 * @module Main
 * @description Master Controller for the trading application. Responsible for
 * querying enabled instruments, spawning dedicated worker processes for each,
 * and maintaining the Broker WebSocket heartbeat.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IMessage } from "#lib/app.util";
import type { IInstrumentPosition } from "#db";

import { openWebSocket, Session } from "#module/session";
import { fork, ChildProcess } from "child_process";
import { clear } from "#lib/app.util";
import { pool, Distinct, InstrumentPosition } from "#db";
import { initiateMasterShutdown, isMasterProcessing, startMasterController } from "../controller/master";

/**
 * Tracks lifecycle and metadata for active instrument sub-processes.
 */
interface ProcessMonitor {
  /** The child process instance created via fork */
  app: ChildProcess;
  /** Metadata regarding the specific symbol and timeframe */
  instrument: Partial<IInstrumentPosition>;
  /** Current number of restart attempts for this specific process */
  retries: number;
}

/**
 * @class CMain
 * @description Orchestrator class that manages the lifecycle of trading workers.
 * It ensures that every "Enabled" instrument has a dedicated process and
 * manages a persistent WebSocket connection for real-time updates.
 */
export class CMain {
  /** Global retry counter for the primary WebSocket service */
  retries: number = 0;

  //** Global keep-alive timer */
  private heartbeatTimer?: NodeJS.Timeout;

  /** Registry of active processes keyed by Symbol name */
  private activeProcesses = new Map<string, ProcessMonitor>();

  /**
   * @method stopMama
   * @description Gracefully shuts down a specific instrument worker.
   */
  public async stopMama(symbol: string): Promise<boolean> {
    const monitor = this.activeProcesses.get(symbol);
    if (!monitor) {
      console.warn(`[Main] Stop command failed: ${symbol} is not running.`);
      return false;
    }

    console.log(`[Main] Sending Ceasefire to Mama: ${symbol} (PID: ${monitor.app.pid})`);

    // Send the IPC shutdown signal we just built
    monitor.app.send({ state: "shutdown", symbol });

    /**
     * We don't delete from the Map yet;
     * the 'exit' listener we wrote in spawnProcess will handle the cleanup
     * once the process actually dies.
     */
    return true;
  }

  /**
   * @method startMama
   * @description Spawns or Restarts a specific instrument worker.
   */
  public async startMama(symbol: string): Promise<boolean> {
    if (this.activeProcesses.has(symbol)) {
      console.warn(`[Main] Start command ignored: ${symbol} is already active.`);
      return false;
    }

    // Fetch instrument metadata from DB
    const instrument = await InstrumentPosition.Fetch({ symbol, account: Session().account });

    if (instrument) {
      const [current] = instrument;
      this.spawnProcess(current);
      return true;
    }

    return false;
  }

  /**
   * @method isMamaActive
   * @description Public accessor for the Watchdog to check OS state.
   */
  public isMamaActive(symbol: string): boolean {
    return this.activeProcesses.has(symbol);
  }

  /**
   * Initializes the WebSocket service for broker push notifications.
   * @private
   * @returns {Promise<WebSocket | undefined>}
   */
  private async setService() {
    return Session().account ? openWebSocket() : undefined;
  }

  /**
   * Spawns a dedicated Node.js child process for a specific instrument.
   *
   * @private
   * @param {Partial<IInstrumentPosition>} instrument_position - Target instrument data.
   * @param {number} [currentRetries=0] - Current recursion depth for restarts.
   * @description
   * - Uses `child_process.fork` to run `./app/process.ts`.
   * - Implements an IPC (Inter-Process Communication) handshake to move the process to 'ready' state.
   * - Monitors for non-zero exit codes and triggers auto-respawn logic.
   */
  private spawnProcess(instrument_position: Partial<IInstrumentPosition>, currentRetries: number = 0) {
    if (instrument_position.symbol && instrument_position.timeframe) {
      const { symbol, timeframe } = instrument_position;

      // Prepare IPC payload
      const ipc = JSON.stringify(clear({ state: "init", account: Session().account!, symbol, timeframe }));

      // 1. Inherit the parent's execution flags (like --experimental-strip-types)
      // This ensures if you change flags at the CLI, the children follow suit automatically.
      const execArgv = [...process.execArgv];

      // 2. Fork with inherited environment
      const app = fork("./app/process.ts", [ipc], {
        execArgv,
        env: { ...process.env }, // This passes all variables from your .env.local.devel
      });

      this.activeProcesses.set(symbol, { app, instrument: instrument_position, retries: currentRetries });

      // IPC Handshake Protocol
      app.on("message", (message: IMessage) => {
        switch (message.state) {
          case "init":
            console.log(`[Info] App.Main: [${symbol}] initialized. Moving to API state.`);
            app.send({ ...message, state: "api" });
            break;
          case "api":
            console.log(`[Info] App.Main: [${symbol}] API synchronization complete. Moving to Update state.`);
            app.send({ ...message, state: "update" });
            break;
          case "update":
            console.log(`[Info] App.Main: [${symbol}] update complete. Marking as Ready.`);
            Object.assign(ipc, clear({ ...message, state: "ready" }));
            break;
          case "shutdown":
            console.log(`[Info] App.Main: [${symbol}] acknowledged shutdown signal.`);
            break;
          default:
            console.warn(`[Error] App.Main: [${symbol}] sent unknown state: ${message.state}`);
        }
        if (message.state === "init") app.send({ ...message, state: "api" });
        else if (message.state === "api") app.send({ ...message, state: "update" });
        else if (message.state === "update") Object.assign(ipc, clear({ ...message, state: "ready" }));
      });

      // Error Handling & Recovery
      app.on("exit", (code, signal) => {
        console.log(`[Info] App.Main: Symbol [${symbol}] exited with code ${code} and signal ${signal}. PID: [${app.pid}]`);

        this.activeProcesses.delete(symbol);

        const maxRetries = 5;
        if (code !== 0 && currentRetries < maxRetries) {
          const nextRetry = currentRetries + 1;
          console.log(`[Warning] App.Main: Attempting restart for [${symbol}] (Retry ${nextRetry}/${maxRetries})...`);

          // Exponential backoff: 2s, 4s, 6s...
          setTimeout(() => this.spawnProcess(instrument_position, nextRetry), 2000 * nextRetry);
        } else if (code !== 0) {
          console.error(`[Error] App.Main: Failed to restart [${symbol}] after ${maxRetries} attempts. Giving up.`);
        }
      });

      console.log(`[Info] App.Main: ${symbol} process spawned; PID [${app.pid}]`);
    }
  }

  /**
   * Orchestrates a tiered shutdown of the entire 2026 Engine.
   */
  private async gracefulShutdown(wss: WebSocket) {
    // 1. Instant Timer Kill: Stop the 29s heartbeat immediately
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      console.log("[Main] Heartbeat monitor stopped.");
    }

    // 2. Ceasefire: Stop Papa from starting new Trades() cycles
    initiateMasterShutdown();

    // 3. WSS Closure
    if (wss.readyState === WebSocket.OPEN) {
      console.log("[Main] Closing Exchange WebSocket...");
      wss.close(1000, "User Initiated Shutdown");
    }

    // 4. Mama Cleanup: Tell every fork to finish their current 500ms loop
    console.log(`[Main] Signaling ${this.activeProcesses.size} workers to exit...`);
    for (const [symbol, monitor] of this.activeProcesses) {
      monitor.app.send({ state: "shutdown", symbol });
    }

    /**
     * 5. THE SAFETY TIMEOUT (FCRT Guard)
     * If Mamas or Papa don't clear within 10 seconds, force the exit.
     * This prevents "Zombies" from hanging your terminal.
     */
    const safetyExit = setTimeout(() => {
      console.error("[Main] Shutdown timed out. Forcing exit to prevent zombie processes.");
      process.exit(1);
    }, 10000);

    // 6. THE DRAIN: Wait for Papa's Mutex and then close the DB
    const finalize = setInterval(async () => {
      if (!isMasterProcessing) {
        clearInterval(finalize);
        clearTimeout(safetyExit); // Clear the safety if we finish on time!

        console.log("[Main] Master logic clear. Draining MySQL Pool...");

        try {
          await pool.end();
          console.log("[Main] Database pool drained. All connections closed.");
        } catch (err) {
          console.error("[Main] Error during pool drain:", err);
        }

        console.log("[Main] Shutdown Complete. PID:", process.pid);
        process.exit(0);
      }
    }, 500);
  }

  /**
   * Primary entry point to start the orchestration engine.
   *
   * @async
   * @returns {Promise<void>}
   * @description
   * 1. Establishes the WebSocket connection.
   * 2. Queries the database for all instruments marked "Enabled" for the current account.
   * 3. Spawns individual processes for each instrument found.
   * 4. Initiates a 29-second heartbeat/reconnection monitor for the WebSocket.
   */
  async Start() {
    // start the wss service
    let wss = await this.setService();

    // Query for instruments where auto_status is "Enabled"
    const authorized = await Distinct<IInstrumentPosition>(
      { account: Session().account, auto_status: "Enabled", symbol: undefined, timeframe: undefined },
      { table: `vw_instrument_positions`, keys: [[`account`], [`auto_status`]] },
    );

    startMasterController();

    if (authorized.success) {
      for (const instrument of authorized.data!) {
        this.spawnProcess(instrument);
      }
    }

    // WebSocket Health Monitor (Heartbeat)
    this.heartbeatTimer = setInterval(async () => {
      if (wss) {
        switch (wss.readyState) {
          case WebSocket.OPEN: {
            wss.send("ping");
            this.retries = 0;
            break;
          }
          case WebSocket.CONNECTING: {
            console.log(`Websocket connecting; attempt #: [ ${++this.retries} ]`);
            // Force close if stuck in connecting state
            this.retries > 2 && wss.close(1002, "Endpoint received malformed frame; socket closed.");
            break;
          }
          case WebSocket.CLOSED: {
            // Attempt Reconnection
            wss = await this.setService();
            break;
          }
        }
      }
    }, 29000);

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    let isAlreadyShuttingDown = false; // Guard flag

    signals.forEach((signal) => {
      process.on(signal, async () => {
        // 1. Race Condition Guard: Prevent double-triggering the shutdown
        if (isAlreadyShuttingDown) return;

        // 2. Early Exit Guard: If WSS never started or is already dead
        const isWssDead = !wss || wss.readyState === WebSocket.CLOSED || wss.readyState === WebSocket.CLOSING;

        if (isWssDead) {
          console.log(`\n[Main] Signal [${signal}] received. WSS is null/closed. Exiting now.`);
          process.exit(0);
        }

        // 3. Initiate Sequence
        isAlreadyShuttingDown = true;
        console.log(`\n[Main] Signal [${signal}] detected. Initiating 2026 Shutdown Sequence...`);

        try {
          // Use the non-null assertion (!) because we verified it's not null above
          await this.gracefulShutdown(wss!);
        } catch (err) {
          console.error("[Main] Error during graceful shutdown:", err);
          process.exit(1); // Exit with error code if shutdown fails
        }
      });
    });
  }
}
