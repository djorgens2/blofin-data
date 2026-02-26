/**
 * @file watchdog.ts
 * @description Papa's Reconciliation Loop using the new View.
*/

"use strict";

import type { CMain } from "#app/main";
import { Update, JobControl } from "#db";
import { Session } from "#module/session";

export const startWatchdog = (papa: CMain) => {
  setInterval(async () => {
    // 1. Fetch only jobs with pending 'IN' commands
    const jobs = await JobControl.Fetch({account: Session().account}, {suffix: 'command <> none'});

    if (!jobs || jobs.length === 0) return;

    for (const job of jobs) {
      if (!job.symbol) continue;

      // Use the public Type Guard instead of accessing private activeProcesses
      const isRunning = papa.isMamaActive(job.symbol);

      // Resolve Intent vs. Reality
      if (job.command === "start" && !isRunning) {
        await papa.startMama(job.symbol);
      } 
      else if (job.command === "stop" && isRunning) {
        await papa.stopMama(job.symbol);
      } 
      else if (job.command === "restart") {
        // restartMama (if implemented) or stop + start sequence
        await papa.stopMama(job.symbol);
      }

      /**
       * 2. Cleanup: Clear the command to 'none' immediately.
       * This stops the Watchdog from double-firing while the fork is spawning.
       */
      await Update(
        { instrument_position: job.instrument_position, command: "none" }, 
        { 
          table: "job_control", 
          keys: [["instrument_position"]], 
          context: "Watchdog.Clear.Command" 
        }
      );
    }
  }, 3000).unref();
};