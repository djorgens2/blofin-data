/**
 * @file JobManager.ts
 * @module CLI/Modules/JobManager
 * @description
 * Interactive provisioning and management layer for the 2026 Engine's job_control state machine.
 * Facilitates the transition of instruments from 'Unprovisioned' or 'Offline' states into
 * active operational perspectives by dispatching intent to the C2 Hub.
 *
 * @version 1.0.0
 * @copyright 2018-2026, Dennis Jorgenson
 * */

"use strict";

import { red, yellow, gray, white, bold, green, cyan } from "console-log-colors";
import { JobControl, Period } from "#db";
import { setHeader } from "#cli/modules/Header";
import { toProperCase } from "#lib/std.util";
import prompts from "prompts";
import UserToken from "#cli/interfaces/user";

/**
 * @function manageJobs
 * @async
 * @description
 * Primary orchestrator for the Job Management CLI.
 * Performs a 3-step recursive workflow:
 * 1. **Perspective Selection**: Filters global jobs by operational status (Running, Unprovisioned, etc.).
 * 2. **Instrument Discovery**: Provides an autocomplete fuzzy-search over the filtered dataset.
 * 3. **C2 Provisioning**: Configures timeframe/reboot logic and commits the 'stop' command
 *    to the DB, signaling the CMain (Papa) watchdog to initialize the process.
 *
 * @returns {Promise<void>} Returns to parent menu on escape; recurses on successful provision or empty state.
 * @throws {DatabaseError} Potential errors during JobControl.Fetch or JobControl.Create.
 */
export async function manageJobs() {
  setHeader("Job Control | Perspective Monitor");

  // 1. SELECT THE PERSPECTIVE (The Funnel)
  const { perspective } = await prompts({
    type: "select",
    name: "perspective",
    message: "Job Control | Select Operational Perspective",
    choices: [
      { title: "🟢  Running", value: { process_status: "running" } },
      { title: "🔴  Offline", value: { process_status: "stopped" } },
      { title: "🆕  Unprovisioned", value: { process_status: "unprovisioned" } }, // Using your new nomenclature!
      { title: "⚠️  Errors", value: { process_status: "error" } },
    ],
  });

  if (!perspective) return; // Exit back to Main Menu

  // 2. Fetch jobs for the selected perspective. The view handles the BINARY to Symbol mapping for us.
  //    Restrict to the current user's jobs for security, and exclude any that are 'Suspended' in the auto_status column
  const jobs = await JobControl.Fetch({ user: UserToken().user, process_status: perspective.process_status }, { suffix: 'AND auto_status != "Suspended" ORDER BY alias, symbol, position' });

  if (!jobs || !jobs.length) {
    console.log(`\n[Info] No jobs found in the '${perspective.title}' perspective.`);
    await new Promise((res) => setTimeout(res, 10000));
    return manageJobs(); // Recurse to let them pick a different perspective
  }

  // 3. SELECT THE INSTRUMENT (The Picklist)
  const { selection } = await prompts({
    type: "autocomplete",
    name: "selection",
    message: `${bold(cyan("PROVISIONING"))} › ${yellow(toProperCase(perspective.process_status))} ${gray("❯")} ${white(jobs.length)} Instruments`,
    // Enable fuzzy searching so the operator can type 'BTC' or 'XRP'
    choices: jobs.map((j) => {
      // Columnar Formatting (The 'Renderer' touch)
      const alias = j.alias?.padEnd(12);
      const symbol = bold(white(j.symbol?.padEnd(20)));
      const side = j.position === "long" ? green("LONG ") : red("SHORT");
      const timeframe = yellow(j.timeframe?.padStart(5));
      const title = `${alias} │ ${symbol} │ ${side} │ ${timeframe}`;
      const description = `${alias} │ Status: ${j.auto_status === "enabled" ? green("Enabled") : red("Disabled")} │ Ready to Provision`;

      return {
        title, // This title is what makes the picklist "Pretty"
        value: j, // The value remains the full UPC for the Machine Boundary
        description, // The description shows the "Metadata" on hover
      };
    }),
    suggest: (input, choices) => Promise.resolve(choices.filter((c) => c.title.toLowerCase().includes(input.toLowerCase()))),
  });

  if (!selection) return;

  // 1. Confirm / Override Timeframe
  const timeframes = await Period.Fetch({}, { suffix: `WHERE timeframe_units > 0 ORDER BY timeframe_units ASC` });
  const initialIndex = timeframes?.findIndex((p) => p.timeframe === selection.timeframe);
  const { selectPeriod } = await prompts({
    type: "select", // Or 'select' if you want a fixed picklist
    name: "selectPeriod",
    message: `Confirm Timeframe for ${selection.symbol}:`,
    initial: initialIndex || 0,
    choices: timeframes
      ? timeframes.map((p) => ({
          title: `${cyan(p.timeframe?.padEnd(5))} ${gray("│ Units:")} ${p.timeframe_units?.toString().padStart(10)} ${gray("│")} ${p.description})`,
          value: p.period, // This is the actual Binary that will be used in provisioning
        }))
      : [{ title: selection.timeframe, value: selection.timeframe }], // Fallback to the original if no periods found
  });

  if (!selectPeriod) return manageJobs(); // Recurse back to the list if they cancel timeframe selection

  // 2. Set Auto-Start Logic
  const { autoStart } = await prompts({
    type: "toggle",
    name: "autoStart",
    message: "Set this job to start automatically on system reboot?",
    initial: true,
    active: "yes",
    inactive: "no",
  });

  // 3. THE FINAL GATE: Proceed to Provision?
  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message: `Ready to provision ${selection.symbol} [${selectPeriod}] ${autoStart ? "(Auto)" : "(Manual)"}?`,
    initial: true,
  });

  if (!proceed) {
    console.log(yellow("Provisioning aborted by Operator."));
    return manageJobs(); // Recurse back to the list
  }

  // THE PROVISIONING (Crossing the Boundary)
  await JobControl.Create({
    // 1. UPC: The Machine ID (Binary Buffer)
    instrument_position: selection.instrument_position,

    // 2. Operator: The User ID (Binary Buffer)
    user: UserToken().user,

    // 3. Command: The Intent (ENUM)
    command: "stop",

    // 4. Sets the job to auto-start on reboot if desired by the operator (Boolean)
    auto_start: autoStart,

    // 5. Confiigures the trading period/timeframe for the job (Binary Buffer)
    period: selectPeriod.value,

    // 6. Context: Optional but helpful for the 'message' column
    message: `Provisioned via CLI: ${selection.symbol}`,
  });

  console.log(
    green(`\n[Success] Provisioned for: ${selection.symbol} with timeframe ${selectPeriod.title} and auto-start ${autoStart ? "ENABLED" : "DISABLED"}.`),
  );
  console.log(`>>> Papa (CMain) is now authorized to spawn Mama for ${selection.symbol}`);

  return manageJobs(); // Recurse back to the list for further management

  //   // 3. Action Menu for the Specific Instrument
  //   const { action } = await prompts({
  //     type: "select",
  //     name: "action",
  //     message: `Manage ${hexString(selection.instrument_position, 12)}:`,
  //     choices: [
  //       { title: "📈 View Visual OHLC Chart", value: "chart" },
  //       { title: "🚀 Start Process", value: "start" },
  //       { title: "🛑 Stop Process", value: "stop" },
  //       { title: "🔄 Restart Process", value: "restart" },
  //       { title: "🛠  Toggle Auto-Start", value: "toggle" },
  //       { title: "📋 Clear Pending Command", value: "none" },
  //     ],
  //   });

  //   if (!action) return;

  //   // 4. Dispatch Logic
  //   switch (action) {
  //     case "chart":
  //       // Launch your existing q.ts chart reporter
  //       const symbol = hexString(selection.instrument_position, 12);
  //       exec(`node --experimental-strip-types --env-file=.env.local.devel ./q.ts -bars  '{"symbol":"${symbol}"}' --chart`);
  //       break;

  //     case "toggle":
  // //      await JobControl.Update({ instrument_position: selection.instrument_position }, { auto_start: !selection.auto_start });
  //       console.log(`[Success] Auto-start toggled for ${hexString(selection.instrument_position, 12)}`);
  //       break;

  //     default:
  //       // Update the ENUM 'command' column to be picked up by the CMain Watchdog
  // //      await JobControl.Update({ instrument_position: selection.instrument_position }, { command: action });
  //       console.log(`[Success] Command '${action.toUpperCase()}' recorded in C2 Hub.`);
  //       break;
  //   }
}
