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

import { ApiError } from "#api";
import { UserToken } from "#cli/interfaces/user";
import type { TOptions } from "#db";
import { Select, Insert, Update, PrimaryKey, User } from "#db";
import { isEqual } from "#lib/std.util";

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
  process_pid: number;
  /** Operational State Key */
  process_state: Uint8Array
  /** Operational Status */
  process_status: "running" | "stopped" | "error" | "unprovisioned" | "starting" | "stopping";
  /** Control Intent: start | stop | restart | pause | none */
  auto_state: Uint8Array;
  auto_status: string;
  command: "none" | "start" | "stop" | "restart" | "pause";
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
    throw new ApiError(1403,"Unauthorized Access: Cannot create a job for another user.");
  }
  const user = await User.Fetch({ user: props.user });

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
