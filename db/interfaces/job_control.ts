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
import { Select, Insert, Update, PrimaryKey } from "#db";

/**
 * Definition of a Trading Job's lifecycle and metadata.
 */
export interface IJobControl {
  /** PRIMARY KEY: Binary ID (3) of the instrument position */
  instrument_position: Uint8Array;
  /** Binary ID (3) of the user issuing the command */
  user: Uint8Array;
  /** Binary ID (3) of the user issuing the command */
  account: Uint8Array;
  /** Binary ID (3) of the user issuing the command */
  instrument: Uint8Array;
  /** Binary ID (3) of the user issuing the command */
  position: string;
  /** Binary ID (3) of the user issuing the command */
  symbol: string;
  /** Current OS Process ID */
  process_pid: number;
  /** Operational Status */
  process_state: "running" | "stopped" | "error";
  /** Control Intent: start | stop | restart | none */
  command: "none" | "start" | "stop" | "restart";
  /** SQL BOOLEAN: 0 (Disabled) or 1 (Enabled) */
  auto_start: boolean;
  /** Feedback/Audit Message */
  message: string;
  /** Timestamp: Spawn success */
  start_time: Date;
  /** Timestamp: Graceful exit */
  stop_time: Date;
}

/**
 * Creates a new job entry. Uses IGNORE to prevent duplicates.
 * @async
 * @function Create
 */
export const Create = async (props: Partial<IJobControl>) => {
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
