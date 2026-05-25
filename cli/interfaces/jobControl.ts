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
import { Log } from "#lib/log.util";
import { delay, hexString } from "#lib/std.util";
import UserToken from "#cli/interfaces/user";

import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process"; // import { dispatchJobCommand } from "#controller/dispatcher";
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
//     Log().error(`\n-> [Denied] ${err.message}`);
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
  Log().errors && Log().error(`\n>> [DEBUG] Job View called with user [${hexString(UserToken().user, 12)}]: ${UserToken().username}`); // Debug log

  setHeader("Job Control | View And Monitor Active Jobs");

  const data = [
    { account: "24597A", alias: "Blofin Demo", broker: "C70CEA", state: "5834D5", status: "Enabled" },
    { account: "304E6A", alias: "Test", broker: "C70CEA", state: "5834D5", status: "Enabled" },
    // ... add the rest of your rows here
  ];

  const menuOptions = ["add", "remove", "delete", "view", "start/stop"];
  let selectedIndex = 0;

  // 1. Helper to render the static table
  function renderTable() {
    console.clear();
    // Headers with fixed padding
    console.log(`\x1b[1;34m%-10s %-15s %-10s %-10s %-10s\x1b[0m`, "account", "alias", "broker", "state", "status");
    console.log("-".repeat(60));

    data.forEach((row) => {
      const statusColor = row.status === "Enabled" ? "\x1b[32m" : "\x1b[31m";
      console.log(`%-10s %-15s %-10s %-10s ${statusColor}%-10s\x1b[0m`, row.account, row.alias, row.broker, row.state, row.status);
    });
    console.log("\n"); // Space before menu
  }

  // 2. The Horizontal Menu Logic
  function renderMenu() {
    process.stdout.write("\x1b[2K\x1b[0G"); // Clear current line
    const menuLine = menuOptions
      .map((opt, i) => {
        return i === selectedIndex ? `\x1b[7m ${opt} \x1b[0m` : `  ${opt}  `;
      })
      .join(" ");

    process.stdout.write(menuLine);
  }

  // Initial Render
  renderTable();
  renderMenu();

  // Input handling (Standard Node.js)
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  process.stdin.on("keypress", (str, key) => {
    if (key.name === "left") {
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : menuOptions.length - 1;
      renderMenu();
    } else if (key.name === "right") {
      selectedIndex = selectedIndex < menuOptions.length - 1 ? selectedIndex + 1 : 0;
      renderMenu();
    } else if (key.name === "return") {
      process.stdout.write(`\n\nExecuting: ${menuOptions[selectedIndex]}...\n`);
      process.exit();
    } else if (key.ctrl && key.name === "c") {
      process.exit();
    }
  });
  await delay(15000)
  //await manageJobs();
};
