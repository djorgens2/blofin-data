/**
 * @file cli/job_manager.ts
 * @description Interactive CLI Cockpit for Mama/Papa Orchestration.
 */

import { dispatchJobCommand } from "#controller/dispatch";
import Prompt from "#cli/modules/Prompts";

export const jobManagerCLI = async (currentUser: { id: Uint8Array, activities: string[] }) => {
  // 1. Fetch the Human-Readable View (The Papas' View)
  const jobs = await db.query("SELECT * FROM vw_job_control");

  const { selection } = await Prompt(["selection"], {
    type: "select",
    message: "--- 2026 ENGINE JOB CONTROL ---",
    choices: jobs.map(j => ({
      title: `[${j.process_state.toUpperCase()}] ${j.symbol} (PID: ${j.process_pid})`,
      value: j
    }))
  });

  const { action } = await Prompt(["action"], {
    type: "select",
    message: `Manage ${selection.symbol}:`,
    choices: [
      { title: "START MAMA", value: "start" },
      { title: "STOP MAMA", value: "stop" },
      { title: "HOT-RESTART", value: "restart" },
      { title: "CANCEL", value: "none" }
    ]
  });

  if (action === "none") return;

  try {
    // 2. THE DISPATCHER (The Adjudicator)
    // Enforces Roles & 'Enabled' status before touching the DB
    await dispatchJobCommand({
      user: currentUser.id,
      instrument_position: selection.instrument_position,
      command: action,
      message: `CLI Manual Override: ${action}`
    });

    console.log(`\n-> [Success] ${action.toUpperCase()} signal sent to Watchdog for ${selection.symbol}`);
  } catch (err) {
    // This catches Constraint 1 (Role) or Constraint 3 (Disabled)
    console.error(`\n-> [Denied] ${err.message}`);
  }
};
