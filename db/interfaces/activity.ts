/**
 * Activity and Task Management.
 * 
 * Manages the categorization of system and user tasks, linking specific 
 * activities to their broader functional Subject Areas.
 * 
 * @module db/activity
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { ISubjectArea } from "#db";
import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";
import { SubjectArea } from "#db";

/**
 * Interface representing a specific system or user activity.
 * Extends {@link ISubjectArea} to include parent categorization metadata.
 */
export interface IActivity extends ISubjectArea {
  /** Primary Key: Unique 6-character hash identifier. */
  activity: Uint8Array;
  /** Human-readable name or description of the specific task. */
  task: string;
}

/**
 * Persists a new activity record to the database.
 * 
 * Logic Flow:
 * 1. Checks for an existing `activity` key to prevent duplicates.
 * 2. Resolves the parent `subject_area` hash using the provided title via {@link SubjectArea.Key}.
 * 3. Generates a new 6-character unique hash for the activity.
 * 4. Inserts the record into the `activity` table.
 * 
 * @param props - Activity details, including the parent `title` and specific `task` name.
 * @returns A promise resolving to the publication result and the new activity primary key.
 */
export const Add = async (props: Partial<IActivity>): Promise<IPublishResult<IActivity>> => {
  if (props.activity) {
    return {
      key: PrimaryKey(props, ["activity"]),
      response: {
        success: false,
        code: 200,
        state: `exists`,
        message: `[Error] Activity add failed; duplicate activity found`,
        rows: 0,
        context: "Activity.Add",
      },
    };
  }

  const subject_area = await SubjectArea.Key({ title: props.title });

  if (subject_area) {
    const activity = hashKey(6);
    const result = await Insert<IActivity>({ activity, subject_area, task: props.task }, { table: `activity`, ignore: true });
    return { key: PrimaryKey({ activity }, ["activity"]), response: result };
  }
  
  console.log("Unauthorized data import attempt; Subject Area not found;");
  return { 
    key: undefined, 
    response: { success: false, code: 404, state: `not_found`, message: ``, rows: 0, context: "Activity.Add" } 
  };
};

/**
 * Searches for an activity's unique primary key based on provided criteria.
 * 
 * @param props - Query parameters (e.g., specific `task` name).
 * @returns The Uint8Array primary key if found, otherwise undefined.
 */
export const Key = async (props: Partial<IActivity>): Promise<IActivity["activity"] | undefined> => {
  if (hasValues<Partial<IActivity>>(props)) {
    const result = await Select<IActivity>(props, { table: `activity` });
    return result.success && result.data?.length ? result.data[0].activity : undefined;
  } else return undefined;
};

/**
 * Retrieves a collection of activity records matching the supplied criteria.
 * 
 * @param props - Filter criteria. Pass `{}` to retrieve all activities.
 * @returns An array of partial activity records, or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IActivity>): Promise<Array<Partial<IActivity>> | undefined> => {
  const result = await Select<IActivity>(props, { table: `activity` });
  return result.success ? result.data : undefined;
};
