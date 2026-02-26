/**
 * @file process.ts
 * @module FractalWorker
 * @description The isolated worker script for a single trading instrument.
 * Orchestrates local state hydration, candle data publication, and
 * fractal calculation updates via IPC (Inter-Process Communication).
 *
 * @copyright 2018, Dennis Jorgenson
 */

"use strict";

import type { IMessage } from "#lib/app.util";

import { CFractal } from "#module/fractal";
import { Session, Config } from "#module/session";
import { parseJSON } from "#lib/std.util";
import { hexify } from "#lib/crypto.util";
import { InstrumentPosition } from "#db";
import { Candles } from "#api";
import { isProcessing, startController } from "../controller/worker";

/**
 * Main execution loop for the instrument worker process.
 *
 * @async
 * @function Process
 * @description
 * 1. Parses CLI arguments to retrieve initial {@link IMessage} configuration.
 * 2. Hydrates the local {@link Session} via {@link Config}.
 * 3. Fetches the {@link InstrumentPosition} from the database.
 * 4. Initializes the {@link CFractal} engine for entry/exit calculations.
 * 5. Listens for IPC messages from the master process to trigger updates.
 *
 * @returns {Promise<void>}
 */
export const Process = async () => {
  // Extract the JSON payload passed from the master fork() call
  const [cli_message] = process.argv.slice(2);
  const message: Partial<IMessage> = parseJSON<IMessage>(cli_message) ?? {};

  // Re-hydrate session configuration locally for this process
  message.account && (await Config({ account: hexify(message.account) }, message.symbol!));

  /**
   * Retrieve the specific position/setting metadata for this fractal
   * from the database to ensure we have the latest 'Enabled' parameters.
   */
  const instrument_position = await InstrumentPosition.Fetch({
    account: Session().account,
    symbol: message.symbol,
    timeframe: message.timeframe,
  });

  if (instrument_position && process.send) {
    const [current] = instrument_position;

    /**
     * PHASE 1: THE HEAVY LIFT
     * We await the full initialization of the Fractal Engine.
     * This includes historical bar processing and indicator warming.
     */
    const Fractal = await CFractal(message, current);

    /**
     * PHASE 2: THE HEARTBEAT
     * Only once the Fractal logic is "Warm", we start the 5000ms loop.
     * This prevents the Controller from trying to 'Trade' on null/cold data.
     */
    startController();

    /**
     * PHASE 3:
     * IPC Message Listener
     * Responds to state transitions (init -> api -> update) sent from main.ts
     */
    process.on("message", async (message: IMessage) => {
      // 1. SHUTDOWN SIGNAL
      if (message.state === "shutdown") {
        console.log(`[Mama] ${message.symbol} received Ceasefire. Checking Mutex...`);

        // We poll the local semaphore to ensure the 500ms fractal cycle is done
        const shutdownCheck = setInterval(() => {
          if (!isProcessing) {
            clearInterval(shutdownCheck);
            console.log(`[Mama] ${message.symbol} local cycle finished. Exiting PID ${process.pid}.`);

            /**
             * PRO-TIP: Close any local DB connections here if Mama
             * has her own private pool, otherwise just exit.
             */
            process.exit(0);
          }
        }, 100);
        return;
      }

      try {
        if (message.state === `api`) {
          // Trigger candle history synchronization for this symbol
          await Candles.Publish(message);
        } else if (message.state === `update`) {
          // Trigger the core fractal entry/exit logic update
          await Fractal.Update(message);
        }

        // Acknowledge completion back to the master process
        process.send && process.send(message);
      } catch (error) {
        console.error(`[Error] Worker PID ${process.pid} - [${message.state}]:`, error);
        // Notify master of a failure in this specific cycle
        process.send && process.send({ ...message, state: "error" });
      }
    });

    /** Exit handler for logging/cleanup */
    process.on("exit", (code) => {
      console.log(`[process] Symbol: [${message!.symbol}] exit; PID: ${process.pid} exited with code ${code}`);
    });

    // Notify master that initialization is complete and worker is ready for 'api' state
    process.send(message);
  } else {
    console.error(`[Critical] Worker ${process.pid}: Missing critical instrument position data.`);
  }
};

// Execute the process entry point
Process();
