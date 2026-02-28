/**
 * Task Group Repository.
 * 
 * Manages the categorization and metadata of task groups within the local database.
 * This module handles the generation of unique hash keys and provides methods for 
 * seeking, inserting, and retrieving task group definitions.
 * 
 * @module db/task_group
 * @copyright 2018-2026, Dennis Jorgenson
 */
"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db/query.utils";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Represents the structure of a Task Group entity.
 */
export interface ITaskGroup {
  /** The unique binary identifier generated via hashKey. */
  task_group: Uint8Array;
  /** The human-readable group_name of the task group. */
  group_name: string;
  /** Comprehensive description of the task group scope. */
  description: string;
}

/**
 * Adds a new task group to the local database.
 * 
 * Automatically assigns a unique 6-byte hash to the `task_group` property 
 * before performing an idempotent insertion.
 * 
 * @param props - Partial task group data to be persisted.
 * @returns An object containing the generated Primary Key and the database transaction result.
 */
export const Add = async (props: Partial<ITaskGroup>): Promise<IPublishResult<ITaskGroup>> => {
  Object.assign(props, { task_group: hashKey(6) });
  const result = await Insert<ITaskGroup>(props, { table: `task_group`, ignore: true });
  return { key: PrimaryKey(props, ["task_group"]), response: result };
};

/**
 * Retrieves the specific `task_group` identifier based on lookup criteria.
 * 
 * Validates that the input properties contain searchable values before 
 * querying the database to find the corresponding binary key.
 * 
 * @param props - Criteria used to locate the task group (e.g., group_name).
 * @returns The binary key of the first match, or `undefined` if no match or empty props provided.
 */
export const Key = async (props: Partial<ITaskGroup>): Promise<ITaskGroup["task_group"] | undefined> => {
  if (hasValues<Partial<ITaskGroup>>(props)) {
    const result = await Select<ITaskGroup>(props, { table: `task_group` });
    return result.success && result.data?.length ? result.data[0].task_group : undefined;
  }
  return undefined;
};

/**
 * Fetches one or more task group records.
 * 
 * This method acts as a general-purpose retriever. If an empty object `{}` is passed, 
 * the database will return all available task group records.
 * 
 * @param props - Filtering parameters for the selection query.
 * @returns A promise resolving to an array of matching records or `undefined` on failure.
 */
export const Fetch = async (props: ITaskGroup): Promise<Array<Partial<ITaskGroup>> | undefined> => {
  const result = await Select<ITaskGroup>(props, { table: `task_group` });
  return result.success ? result.data : undefined;
};
