/**
 * @file trades.ts
 * @summary State-Machine Orchestrator for High-Sensitivity Trading
 * @description
 * Manages the sequential promotion of orders through lifecycle states.
 * This logic is strictly serial: each step depends on the state-resolution
 * of the previous function (e.g., Rejects must be handled before new Queues are processed).
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import { Stops } from "#stops";
import { Requests } from "#requests";
import { Positions, Orders, StopOrders } from "#api";

/**
 * Sequential Order Pipeline.
 *
 * @internal
 * @description
 * Processes order transitions in a strict dependency chain:
 * 1. **Rejected**: Identifies fixable errors and promotes to Queued.
 * 2. **Pending**: Monitors active exchange requests.
 * 3. **Canceled**: Cleanup of stale/invalidated orders.
 * 4. **Hold**: Handles 'LOCKED' states (e.g., waiting for leverage upgrades).
 * 5. **Queued**: Final execution gate for all promoted/new orders.
 *
 * @note This sequence is synchronous to prevent state-racing.
 */
const processOrders = async (): Promise<void> => {
  await Requests.Rejected();
  await Requests.Pending();
  await Requests.Canceled();
  await Requests.Hold();
  await Requests.Queued();
};

/**
 * Sequential Stop-Order Pipeline.
 *
 * @internal
 * @description
 * Synchronizes trigger-based orders (SL/TP). Like standard orders, these
 * are processed serially to ensure that a rejected stop-loss is
 * re-queued before the final execution check.
 */
const processStops = async (): Promise<void> => {
  await Stops.Rejected();
  await Stops.Pending();
  await Stops.Canceled();
  await Stops.Hold();
  await Stops.Queued();
};

/**
 * Main Trade Reconciliation Entry Point.
 *
 * @async
 * @description
 * Orchestrates a complete 'Heartbeat' of the trading engine:
 * 1. Concurrent Import: Refreshes the local memory of the exchange state.
 * 2. Order Pipeline: Moves standard orders through the state machine.
 * 3. Stop Pipeline: Moves stop/trigger orders through the state machine.
 *
 * @throws {Error} Caught internally to prevent loop termination.
 */
export const Trades = async (): Promise<void> => {
  const start = performance.now();

  try {
    /**
     * Concurrent Import:
     * This is the only parallel step. We need the full 'Current Picture'
     * before starting the dependent sequential processing.
     */
    await Promise.all([Positions.Import(), Orders.Import(), StopOrders.Import()]);

    // Dependent Execution Chains
    await processOrders();
    await processStops();

    const duration = (performance.now() - start).toFixed(2);
    console.log(`[Info] Execute.Trades: Cycle Complete (${duration}ms)`);
  } catch (error) {
    console.error(`[Error] Execute.Trades: Cycle failed:`, error);
  }
};
