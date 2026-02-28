/**
 * @module Instrument-Controller
 * @description Search and selection logic for Database-driven Instruments.
 */

"use strict";

//import type { IInstrumentPosition } from "#db/interfaces/instrument_position";
//import type { ITableConfig } from "#cli/modules/Renderer";

import { gray } from "console-log-colors";
import { setHeader } from "#cli/modules/Header";
//import { renderTable } from "#cli/modules/Renderer";
import prompts from "prompts";

//import * as InstrumentPosition from "#db/interfaces/instrument_position";
import * as Accounts from "#db/interfaces/account";
import { manageJobs } from "#cli/modules/JobManager";
import { Log } from "#module/session";
import { hexString } from "#lib/std.util";
import UserToken from "#cli/interfaces/user";

// import { dispatchJobCommand } from "#controller/dispatcher";
// import { JobControl } from "#db";
// import Prompt from "#cli/modules/Prompts";

// export const jobManagerCLI = async (currentUser: { id: Uint8Array, activities: string[] }) => {
//   // 1. Fetch the Human-Readable View (The Papas' View)
//   const jobs = await JobControl.Fetch({ });

//   const { selection } = await Prompt(["selection"], {
//     type: "select",
//     message: "--- 2026 ENGINE JOB CONTROL ---",
//     choices: jobs.map(j => ({
//       title: `[${j.process_state.toUpperCase()}] ${j.symbol} (PID: ${j.process_pid})`,
//       value: j
//     }))
//   });

//   const { action } = await Prompt(["action"], {
//     type: "select",
//     message: `Manage ${selection.symbol}:`,
//     choices: [
//       { title: "START MAMA", value: "start" },
//       { title: "STOP MAMA", value: "stop" },
//       { title: "HOT-RESTART", value: "restart" },
//       { title: "CANCEL", value: "none" }
//     ]
//   });

//   if (action === "none") return;

//   try {
//     // 2. THE DISPATCHER (The Adjudicator)
//     // Enforces Roles & 'Enabled' status before touching the DB
//     await dispatchJobCommand({
//       user: currentUser.id,
//       instrument_position: selection.instrument_position,
//       command: action,
//       message: `CLI Manual Override: ${action}`
//     });

//     console.log(`\n-> [Success] ${action.toUpperCase()} signal sent to Watchdog for ${selection.symbol}`);
//   } catch (err) {
//     // This catches Constraint 1 (Role) or Constraint 3 (Disabled)
//     console.error(`\n-> [Denied] ${err.message}`);
//   }
// };

/**
 * Step 1: Select Account (Autocomplete)
 * Filters the account list if you have many (Dev, Test, Prod, etc.)
 * (Eventually) Also serves as the 'Authorization' step by only showing accounts you have access to, which then filters the symbols
 * you see in Step 2. This is the "Key" that unlocks the rest of the UI and maps database-driven privileges to TypeScript execution paths.
 */
export const accountSelect = async (): Promise<string | undefined> => {
  const accounts = await Accounts.Fetch({});
  if (!accounts) return undefined;

  const { alias } = await prompts({
    type: "autocomplete",
    name: "alias",
    message: "  Select Account:",
    choices: accounts.map((acc) => ({
      title: `${acc.status === "Enabled" ? "🔹" : "🔸"} ${acc.alias} ${gray(`(${acc.environ})`)}`,
      value: acc.alias,
    })),
    suggest: (input, choices) => Promise.resolve(choices.filter((i) => i.title.toLowerCase().includes(input.toLowerCase()))),
  });

  return alias;
};

/**
 * Step 3: View (The "Paint the Screen" Logic)
 * Aggregates selections and renders the final grid.
 */
export const View = async () => {
  Log().errors && console.error(`\n>> [DEBUG] Job View called with user [${hexString(UserToken().user, 12)}]: ${UserToken().username}`); // Debug log

  setHeader("Job Control | View And Monitor Active Jobs");

  await manageJobs();
};
