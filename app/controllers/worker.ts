/**
 * @file controller.ts
 * @module TradingController
 * @description
 * Acts as the 'Heartbeat' for each instrument-specific process.
 * Orchestrates the transition of orders through the 2026 Promotion Pipeline
 * (Rejected -> Pending -> Canceled -> Hold -> Queued).
 *
 * @copyright 2026, Dennis Jorgenson
 */

"use strict";

// Node 22+ Native ESM requires explicit extensions
import { Session } from "#app/session";
import { Trades } from "#module/trades";
import { Log } from "#lib/log.util";
/**
 * Binary Semaphore (Mutex).
 * @type {boolean}
 * @public
 * @description Prevents "Race Conditions" where a second trading cycle starts
 * before the first has finished its API/DB calls. Also utilized by
 * shutdown.ts for graceful termination.
 */
export let isProcessing = false;

/**
 * Initializes and starts the symbol-specific trade controller heartbeat.
 *
 * @function startController
 * @description
 * 1. Pulls 'ipcPingTimeMs' (Frequency) from the Session config.
 * 2. Monitors the WSS 'connected' state as a connectivity gate.
 * 3. Executes the {@link Trades} pipeline every N milliseconds.
 */
export const startController = (account: Uint8Array) => {
  const { config, alias } = Session(account)!;

  // 2026 Default: 5000ms if not specified in the instrument's DB config
  const interval = config?.ipcPingTimeMs ?? 5000;

  console.log(`[Controller] ${alias} heartbeat started: ${interval}ms`);

  setInterval(async () => {
    const session = Session();

    // 1. Connectivity Gate: Only trade when the master WSS feed is healthy
    if (session.state !== "connected") {
      return;
    }

    // 2. Mutex Gate: Prevent overlapping cycles if the API or Database is under load
    if (isProcessing) {
      console.warn(`[Controller] Lag detected for ${alias}. Previous cycle still active. Skipping heartbeat.`);
      return;
    }

    try {
      isProcessing = true; // Lock the semaphore

      /**
       * Primary Execution Engine:
       * Handles fractal re-calc, order promotion, and risk management.
       */
      await Trades();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown Error";
      Log().error(`[Controller] ${account} cycle failed: ${msg}`);
    } finally {
      isProcessing = false; // Release the lock even on failure
    }
  }, interval);
};
