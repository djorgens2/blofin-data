/**
 * Subject Area Repository.
 * 
 * Manages the categorization and metadata of subject areas within the local database.
 * This module handles the generation of unique hash keys and provides methods for 
 * seeking, inserting, and retrieving subject area definitions.
 * 
 * @module db/subject_area
 * @copyright 2018-2026, Dennis Jorgenson
 */
"use strict";

import type { IPublishResult } from "#api";
import { Select, Insert, PrimaryKey } from "#db/query.utils";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

/**
 * Represents the structure of a Subject Area entity.
 */
export interface ISubjectArea {
  /** The unique binary identifier generated via hashKey. */
  subject_area: Uint8Array;
  /** The human-readable title of the subject area. */
  title: string;
  /** Comprehensive description of the subject area scope. */
  description: string;
}

/**
 * Adds a new subject area to the local database.
 * 
 * Automatically assigns a unique 6-byte hash to the `subject_area` property 
 * before performing an idempotent insertion.
 * 
 * @param props - Partial subject area data to be persisted.
 * @returns An object containing the generated Primary Key and the database transaction result.
 */
export const Add = async (props: Partial<ISubjectArea>): Promise<IPublishResult<ISubjectArea>> => {
  Object.assign(props, { subject_area: hashKey(6) });
  const result = await Insert<ISubjectArea>(props, { table: `subject_area`, ignore: true });
  return { key: PrimaryKey(props, ["subject_area"]), response: result };
};

/**
 * Retrieves the specific `subject_area` identifier based on lookup criteria.
 * 
 * Validates that the input properties contain searchable values before 
 * querying the database to find the corresponding binary key.
 * 
 * @param props - Criteria used to locate the subject area (e.g., title).
 * @returns The binary key of the first match, or `undefined` if no match or empty props provided.
 */
export const Key = async (props: Partial<ISubjectArea>): Promise<ISubjectArea["subject_area"] | undefined> => {
  if (hasValues<Partial<ISubjectArea>>(props)) {
    const result = await Select<ISubjectArea>(props, { table: `subject_area` });
    return result.success && result.data?.length ? result.data[0].subject_area : undefined;
  }
  return undefined;
};

/**
 * Fetches one or more subject area records.
 * 
 * This method acts as a general-purpose retriever. If an empty object `{}` is passed, 
 * the database will return all available subject area records.
 * 
 * @param props - Filtering parameters for the selection query.
 * @returns A promise resolving to an array of matching records or `undefined` on failure.
 */
export const Fetch = async (props: ISubjectArea): Promise<Array<Partial<ISubjectArea>> | undefined> => {
  const result = await Select<ISubjectArea>(props, { table: `subject_area` });
  return result.success ? result.data : undefined;
};
