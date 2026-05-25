/**
 * @file job_control.ts
 * @module DB/JobControl
 * @description
 * Data Access Layer (DAL) for the 'job' table.
 * Note: Hard deletes are disabled to maintain FCRT audit integrity.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TOptions } from "#db";
import type { IUserAccounts } from "#db/types";

import { ApiError } from "#api";
import { UserToken } from "#cli/interfaces/user";
import { Select, Insert, Update, PrimaryKey, Distinct } from "#db";
import { Log, routeLogs } from "#lib/log.util";
import { isEqual } from "#lib/std.util";
import { confirmProcess } from "#lib/system.util";

/**
 * Definition of a Trading Job's lifecycle and metadata.
 */
export interface IJobControl {
  /** PRIMARY KEY: Binary ID (3) of the instrument position */
  instrument_position: Uint8Array;
  /** Binary ID (3) of the job account */
  account: Uint8Array;
  alias: string;
  nickname: string;
  /** Binary ID (3) of the user */
  user: Uint8Array;
  /** Binary ID (3) of the job user */
  instrument: Uint8Array;
  symbol: string;
  /** Binary ID (3) of the user */
  position: string;
  /** Current OS Process ID */
  period: Uint8Array;
  timeframe: string;
  /** Process handling */
  pid: number;
  process_name: string;
  /** Operational State Key */
  process_state: Uint8Array;
  /** Operational Status */
  process_status: string;
  /** Control Intent: start | stop | restart | pause | none */
  auto_state: Uint8Array;
  auto_status: string;
  command: string;
  /** Feedback/Audit Message */
  message: string;
  /** SQL BOOLEAN: 0 (Disabled) or 1 (Enabled) */
  auto_start: boolean;
  /** Timestamp: Spawn success */
  start_time: Date;
  /** Timestamp: Graceful exit */
  stop_time: Date;
  /** Calculated field: Total uptime in seconds */
  system_up_time: number;
}

/**
 * Creates a new job entry. Uses IGNORE to prevent duplicates.
 * @async
 * @function Create
 */
export const Create = async (props: Partial<IJobControl>) => {
  if (!props.user || !isEqual(props.user!, UserToken().user)) {
    throw new ApiError(1403, "Unauthorized Access: Cannot create a job for another user.");
  }
  // We use Insert with IGNORE to prevent duplicates. The DB schema should enforce uniqueness on instrument_position.
  const result = await Insert<IJobControl>(props, { table: `job_control`, ignore: true, context: "Job.Control.Create" });
  return { key: PrimaryKey(props, ["instrument_position"]), response: result };
};

/**
 * Updates Job metadata or configuration.
 * @async
 * @function Configure
 */
export const Configure = async (props: Partial<IJobControl>) => {
  // We use Insert with the expectation that the DB/Util handles the Update on Duplicate Key
  const result = await Update<IJobControl>(props, { table: `job_control`, context: "Job.Control.Configure" });
  return { key: PrimaryKey(props, ["instrument_position"]), response: result };
};

/**
 * Submits a UI/CLI command to the Papa Watchdog.
 * @async
 * @function Command
 */
export const Command = async (props: Partial<IJobControl>) => {
  const result = await Update<IJobControl>(props, { table: `job_control`, context: "Job.Control.Command" });
  return { key: PrimaryKey(props, ["instrument_position"]), response: result };
};

/**
 * Retrieves records meeting criteria.
 * Papa's Watchdog uses this to find pending commands.
 * @async
 * @function Fetch
 */
export const Fetch = async (props: Partial<IJobControl>, options?: TOptions<IJobControl>): Promise<Array<Partial<IJobControl>> | undefined> => {
  const result = await Select<IJobControl>(props, { table: `vw_job_control`, ...options });
  return result.success ? result.data : undefined;
};

export const Alive = async (process_name: string) => {
  const exists = await Fetch({ process_name }, { suffix: "WHERE stop_time IS NULL ORDER BY start_time DESC" });

  if (!exists) return false;

  exists.forEach((job, id) => {
    if (id) {
      Log().error(`[Panic] Multiple jobs found for process ${process_name}`, "JobControl.Alive");
      process.exit(2);
    }

    return confirmProcess(job.pid!, process_name, job.start_time!.getTime());
  });
};

export const MasterStatus = async (process_name: string): Promise<{prod: boolean, demo: boolean} | undefined> => {
  //const exists = await Distinct({ master_status }, { suffix: "WHERE stop_time IS NULL ORDER BY start_time DESC" });

  //if (!exists) return undefined};

};

/**
 * @function Initialize
 * @description
 * 1. Queries all 'Enabled' accounts within the logged users' purview;
 * 2. Spawns a detached Account-specific process for each.
 * 3. Hands off the verified UserToken for administrative persistence.
 */
const Initialize = async () => {
  const accounts = await Select<IUserAccounts>({ status: "Enabled", auth_status: "Enabled" }, { table: `vw_user_accounts` });

  if (!accounts.success || !accounts.data?.length) {
    Log().error(`[Error] App.Initialize: No Authorized Accounts to operate; check your permissions`);
    return;
  }

  // Application master process launcher
  accounts.data.forEach(({ account }) => {
    const app = new CMain(account); // Born with a Passport
    app.Start();
  });
};

const SystemHealthCheck = async () => {
  const jobs = await Select<IVwJobControl>({}, { table: 'vw_job_control' });
  
  console.log(`\n--- System Status Registry ---`);
  jobs.data.forEach(job => {
    const stateHex = job.master_state.toString('hex');
    const color = stateHex === 'dead' ? '\x1b[31m' : '\x1b[32m'; // Red for 0xDEAD
    
    console.log(`${color}[${job.symbol}] ${job.master_status} | Up: ${job.system_up_time}\x1b[0m`);
    
    if (stateHex === 'dead') {
       console.log(`  └─ [Alert] PID ${job.master_pid} lost. Janitor audit required.`);
    }
  });
};

export const Reboot = async () => {
  routeLogs("system.recovery");
  Log().info(">> [RECOVERY] System Reboot Detected. Initiating Auto-Start...");

  // Headless logic: Reclaim dead PIDs and spawn 'auto_start' jobs immediately
  await ReclaimZombies();
  await Initialize({ mode: "AUTO" });

  Log().info(">> [RECOVERY] All authorized Papas dispatched. System Online.");
  process.exit(0); // Exit the launcher; Papas live on as detached PIDs
};
