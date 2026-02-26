/**
 * @file master.controller.ts
 * @summary Global Supervisory Controller (Papa)
 * @description 
 * Orchestrates the global Trades() engine. This process is the 
 * single authority for executing the Queue and reconciling 
 * cross-instrument states.
 */

import { Trades } from "#module/trades.ts";
import { Session } from "#module/session.ts";

export let isMasterProcessing = false;
export let isShuttingDown = false;

/**
 * Signals the Master Controller to stop initiating new cycles.
 */
export const initiateMasterShutdown = () => {
  isShuttingDown = true;
  console.log("[Papa] Shutdown signal received. Blocking new trade cycles.");
};

/**
 * Starts the Global Heartbeat for the entire account.
 * This oversees all instrument-specific activity.
 */
export const startMasterController = () => {
  // Papa typically runs at a slightly different rhythm than Mama
  const interval = Session().config?.masterCycleTimeMs ?? 2000; // 2s global reconciliation

  console.log(`[Papa] Master Controller active. Reconciling all instruments every ${interval}ms`);

  setInterval(async () => {
    if (Session().state !== "connected") return;
    if (isMasterProcessing) return;

    try {
      isMasterProcessing = true;
      
      /**
       * The Master Trades() call:
       * 1. Imports ALL Positions/Orders.
       * 2. Processes the global Queue (filled by Mama processes).
       * 3. Handles global Rejected/Pending/Canceled states.
       */
      await Trades();

    } catch (error) {
      console.error("[Papa] Master Reconciliation Failed:", error);
    } finally {
      isMasterProcessing = false;
    }
  }, interval);
};


