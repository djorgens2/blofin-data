/**
 * @file process.ts
 * @module FractalWorker
 * @description The isolated worker script for a single trading instrument.
 * Orchestrates local state hydration, candle data publication, and
 * fractal calculation updates via IPC (Inter-Process Communication).
 *
 * #version 1.0.0 - Initial implementation of the fractal worker process.
 * #version 1.1.0 - Added graceful shutdown handling and error reporting.
 * #version 1.2.0 - Refactored for clearer separation of initialization and update logic.
 * @version 1.3.0 - Refactored worker entry point. Uses O(1) Session access and reactive IPC state management.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IMessage } from "#lib/ipc.util";

//import { CFractal } from "#module/fractal";
import { Log } from "#lib/log.util";
import { IpcHeader } from "#lib/ipc.util";
import { Session, setSession } from "#app/session";
import { Candles } from "#api";
import { delay } from "#lib/std.util";

/**
 * 1. INITIALIZATION: Handshake with Papa
 * We capture the "Birth Certificate" from ARGV immediately.
 */
const setup = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const message: IMessage = IpcHeader(setup, "init");

/** 2. Cool-down timer properties */
let LAST_RECEIPT = 0;
const MIN_GAP = message?.config?.apiCooldownMs || 1500;

// Lock the identity into the local singleton immediately
setSession(message);

/**
 * 2. EXECUTION: The Logic Heartbeat
 * Mama stays alive and responds to Papa's state transitions.
 */
process.on("message", async (message: IMessage) => {
  // Update local session with any incoming deltas (auth, config, etc)
  const ipc = IpcHeader(message, message.state);
  setSession(ipc);

  try {
    // 3. CHATTERBOX PROTECTION
    // We only throttle data-heavy or rate-limited states
    if (["api", "update"].includes(ipc.state)) {
      const elapsed = Date.now() - LAST_RECEIPT;
      if (elapsed < MIN_GAP) {
        const snooze = MIN_GAP - elapsed;
        // console.log(`[Mama] Cooldown: Sleeping ${snooze}ms for ${ipc.symbol}`);
        await delay(snooze);
      }
      LAST_RECEIPT = Date.now(); // Reset the clock AFTER the wait
    }
    switch (ipc.state) {
      case "api":
        /**
         * Mama now uses Session() internally for credentials.
         * Sync historical candle data.
         */
        await Candles.Publish(ipc);
        break;

      case "update":
        /**
         * Core fractal logic update cycle.
         * Logic moved to reactive handlers to keep this switch clean.
         */
        // await Fractal.Update(ipc);
        break;

      case "shutdown":
        console.log(`[Mama] ${Session<IMessage>().symbol} shutting down...`);
        // Add Mutex/isProcessing check here if needed before exit
        process.exit(0);
        break;
    }

    // Always ACK back to Papa so he knows the cycle finished
    process.send?.(ipc);
  } catch (error) {
    Log().error(`[Mama Error] ${Session<IMessage>().symbol}:`, error);
    process.send?.({ ...ipc, state: "error", error });
  }
});

// Initial "I'm Alive" signal to Papa
process.send?.(message);
