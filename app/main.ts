/**
 * @file main.ts
 * @module Main
 * @description
 * Dedicated Papa Hub Controller. Manages the WebSocket lifecycle
 * and orchestrates a fleet of instrument-specific forked processes
 * for a single, identity-locked account.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { ISession } from "#app/session";
import type { IMessage } from "#lib/ipc.util";
import type { IInstrumentPosition } from "#db";

import { openWebSocket, Session, Config } from "#app/session";
import { fork, ChildProcess } from "child_process";
import { IpcHeader } from "#lib/ipc.util";
import { Select, pool, InstrumentPosition } from "#db";
import { initiateMasterShutdown, isMasterProcessing, startMasterController } from "#app/controllers/master";
import { hexString } from "#lib/std.util";
import { Log, routeLogs } from "#lib/log.util";
import { Loader } from "#db/loader.util";

/**
 * @interface ProcessMonitor
 * @description Tracks the OS process and database metadata for a Mama worker.
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
 * @description
 * @param {Uint8Array} account - Passed during class intantiation to lock account identity
 * Orchestrates the "One-to-Many" relationship between a single Exchange
 * WebSocket (Parent) and multiple technical analysis workers (Child).
 */
export class CMain {
  /** Class identity uses 'readonly' to lock the identity for the life of the PID */
  private readonly account: Uint8Array;

  /** Registry of active processes keyed by Symbol name */
  private activeProcesses = new Map<string, ProcessMonitor>();

  /** Global retry counter for the primary WebSocket service */
  retries: number = 0;

  //** Global keep-alive timer */
  private heartbeatTimer?: NodeJS.Timeout;

  /**
   * @constructor
   * @param {Uint8Array} account - The binary key for the account passport.
   */
  constructor(account: Uint8Array) {
    this.account = account;
  }

  /**
   * @method setService
   * @description
   * 1. Hydrates the Account Passport (Session).
   * 2. Routes local logging to a dedicated file.
   * 3. Initiates the WebSocket handshake.
   */
  private async setService() {
    await Config({ account: this.account }, "Set.Service");

    // Fetch the specific passport from the Registry
    const passport = Session<ISession>(this.account);
    if (!passport?.account) {
      Log().error(`[Main] Failed to hydrate passport for ${hexString(this.account, 6)}`);
      return;
    }

    // Isolate logs for this PID
    routeLogs(passport.alias);

    // Secure Identity Dump
    Log(this.account).session(`[Service] ${passport.alias} WSS Init`);

    return openWebSocket(passport);
  }

  /**
   * @method stopMama
   * @description Gracefully shuts down a specific instrument process by signaling a worker to exit.
   *  Cleanup is deferred to the 'exit' event listener.
   */
  public async stopMama(symbol: string): Promise<boolean> {
    const processKey = `${hexString(this.account, 6)}:${symbol}`;
    const monitor = this.activeProcesses.get(processKey);

    if (!monitor) return false;

    console.log(`[Main] Signaling ${symbol} (PID: ${monitor.app.pid}) to shut down.`);
    monitor.app.send({ state: "shutdown", symbol });
    return true;
  }

  /**
   * @method startMama
   * @description Fetches fresh metadata and spawns a new dedicated instrument worker.
   */
  public async startMama(symbol: string, account: Uint8Array): Promise<boolean> {
    // 1. Generate the Registry Key (Account + Symbol)
    const processKey = `${hexString(account, 6)}:${symbol}`;

    if (this.activeProcesses.has(processKey)) {
      console.log(`[Main] ${symbol} already active. Skipping spawn.`);
      return false;
    }

    // 2. Fetch from DB using the explicit account key
    const instrument = await InstrumentPosition.Fetch({ symbol, account });

    if (instrument?.length) {
      const [current] = instrument;
      // Pass the account into the spawn logic
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
    const { account, symbol, position, timeframe, instrument, period } = instrument_position;
    const authorization = `${symbol}:${position}`;

    if (account) {
      // 1. Create the Identity-Locked Header; We pass the RAW keys; IpcHeader will hexify them into the JSON payload
      const header = IpcHeader({
        state: "init",
        account: account || this.account,
        instrument,
        position,
        period,
        symbol,
        timeframe,
      });

      const ipcPayload = JSON.stringify(header);

      // 2. Fork with identical execution environment
      const execArgv = [...process.execArgv];
      const app = fork("./app/process.ts", [ipcPayload], {
        execArgv,
        env: { ...process.env },
      });

      // Track the process locally
      this.activeProcesses.set(authorization, { app, instrument: instrument_position, retries: currentRetries });

      // 3. The New Lifecycle Protocol
      app.on("message", (message: IMessage) => {
        // Essential: Re-Hexify the incoming message identity
        const msg = IpcHeader(message, message.state);

        switch (msg.state) {
          case "init":
            console.log(`[Info] ${authorization} Initialized. ID: ${hexString(msg.instrument, 6)}...`);
            app.send(IpcHeader(msg, "api"));
            break;

          case "complete": // Replacing 'update' with our new 'complete' state
            console.log(`[Audit] ${authorization} Sync Complete. Inserts: ${msg.audit?.["Candle.Import.Load"]?.rows || 0}`);
            // Stay in ready state or loop back to sync
            break;

          case "error":
            Log().error(`[Alert] ${authorization} Reporting Error: ${msg.status.text}`);
            if (msg.status.fatal) app.kill(); // Papa intervenes on fatal errors
            break;

          default:
            console.log(`[Status] ${authorization} state: ${msg.state}`);
        }
      });

      // 4. Exit & Retry Logic (using your backoff formula)
      app.on("exit", (code) => {
        this.activeProcesses.delete(authorization);
        if (code !== 0 && currentRetries < 5) {
          const delay = 3000 * (currentRetries + 1); // Your 3x logic
          setTimeout(() => this.spawnProcess(instrument_position, currentRetries + 1), delay);
        }
      });

      console.log(`[Spawn] ${authorization} [${timeframe}] PID: ${app.pid}`);
    } else {
      Log().error(`[Error] Spawn failed: Missing Identity Keys for ${symbol}`);
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
      Log().error("[Main] Shutdown timed out. Forcing exit to prevent zombie processes.");
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
          Log().error("[Main] Error during pool drain:", err);
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

    // 1. Critical Dependency: Load seed first
    await Loader("../db/seed/", "Seed");

    // Query for instruments where auto_status is "Enabled"
    const authorized = await Select<IInstrumentPosition>({ account: this.account, auto_status: "Enabled" }, { table: `vw_instrument_positions` });

    authorized?.success && authorized.data && authorized.data.map((auth) => this.spawnProcess(auth));

    startMasterController(this.account);

    // // WebSocket Health Monitor (Heartbeat)
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
        console.log(`\n[Main] Signal [${signal}] detected. Initiating Shutdown Sequence...`);

        try {
          // Use the non-null assertion (!) because we verified it's not null above
          await this.gracefulShutdown(wss!);
        } catch (err) {
          Log().error("[Main] Error during graceful shutdown:", err);
          process.exit(1); // Exit with error code if shutdown fails
        }
      });
    });
  }
}
