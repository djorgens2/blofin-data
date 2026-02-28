/**
 * @file app.ts
 * @module ApplicationEntry
 * @description Entry point for the trading application. Handles environment
 * configuration, data synchronization, and application bootstrapping.
 *
 * @copyright 2018, Dennis Jorgenson
 */

"use strict";

import { importCandles, importInstruments } from "#app/import";
import { Log, Session, Config } from "#module/session";
import { hexify } from "#lib/crypto.util";
import { CMain } from "#app/main";
import { Positions, Orders, StopOrders } from "#api";
import { Loader } from "#db/loader.util";

/**
 * @async
 * @function initialize
 * @description
 * Sequence:
 * 1. Synchronously waits for Seed data (required for subsequent calls).
 * 2. Concurrently imports instruments, candles, and account state.
 * 3. Finalizes bootstrap via CMain.
 * 
 * @throws {SeedNotFoundError} If the path "../db/seed/" is unreachable.
 * @throws {InitializationError} If parallel imports fail.
 */
const initialize = async () => {
  // 1. Critical Dependency: Load seed first
  await Loader("../db/seed/", "Seed");

  // 2. Parallel Load: All functions that depend on the seed
  await Promise.all([importInstruments(), importCandles(), Positions.Import(), Orders.Import(), StopOrders.Import()]);

  setTimeout(async () => {
    console.log("[Info] Application.Initialization finished:", new Date().toLocaleString());

    const app = new CMain();
    app.Start();
  }, 1500);
};

/**
 * Application Self-Invoking Entry Point
 *
 * @constant account
 * @type {string}
 * @description The hex-encoded account identifier derived from environment variables.
 * Priority: `process.env.account` > `process.env.SEED_ACCOUNT` > fallback `???`.
 */
const account = hexify(process.env.account || process.env.SEED_ACCOUNT || `???`);

/**
 * Initializes the Session Configuration.
 * If successful, logs session metadata and triggers the {@link initialize} sequence.
 */
Config({ account }, "Start").then(async () => {
  console.log("[Info] Application.Initialization start:", new Date().toLocaleString());
  console.log(`-> Active.Session:`, Session().Log());
  console.log(`-> Log.Config:`, Log());

  await initialize();
});
