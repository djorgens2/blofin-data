/**
 * System Lexicon: Unified Status and Error Codes.

 * @file lexicon.ts
 * @module api/Lexicon
 * 
 * @description
 * The complete and unabridged error dictionary for all WSS, REST API, and Database calls
 *
 * Range        Category            Description
 * 0000 - 0999	Success/Info        (Primitives) Operations that finished as expected (e.g., 0000 for generic OK).
 * 1000 - 1999	Warnings            Completed successfully, but with non-critical issues (e.g., 1102 for "Synced, but some metadata missing").
 * 2000 - 2999	Client Errors       Issues the user can fix (e.g., 2001 for Invalid JSON, 2403 for Permissions).
 * 3000 - 3999	Validation          Specific data errors (e.g., 3105 for Invalid Currency Format).
 * 4000 - 4999	Database (dbError)  Specific DB failures (e.g., 4001 Connection lost, 4022 Deadlock).
 * 5000 - 5999	Critical/System     Unhandled exceptions or external service timeouts.
 * 
 * @copyright 2018-2026, Dennis Jorgenson
*/

"use strict";

/**
 * @file ErrorLexicon.ts
 * @description Standardized C2 Hub Error/Status Codes.
 * Range-bound categorization for the 2026 Engine.
 */
export const SC = {
  // 0-999: Primitives (Success/HTTP-ish)
  OK: 0,
  NO_UPDATE: 200,
  KEY_EXISTS: 201,
  KEY_NOT_FOUND: 202,
  NULL_QUERY: 400,
  NOT_FOUND: 404,

  // 1000-1999: Warnings (Partial Success)
  FIELDS_MISSING: 1001,
  PARTIAL_SYNC: 1100,

  // 2000-2999: Client Logic (Input)
  MALFORMED_WSS: 2001,
  INVALID_SESSION: 2100,
  UNAUTHORIZED_ACCESS: 2101,

  // 4000-4999: Persistence (Database)
  UPSERT_FAIL: 4001,
  CURRENCY_MISSING: 4002,
} as const;

export type StatusCode = (typeof SC)[keyof typeof SC];

/** Human-readable map for logs/API responses */
export const StatusMessage: Record<StatusCode, string> = {
  [SC.OK]: "Operation completed successfully.",
  [SC.NULL_QUERY]: "Null Query: Query must have properties.",
  [SC.NO_UPDATE]: "Requested key found: no differences detected.",
  [SC.KEY_EXISTS]: "Data for requested key exists.",
  [SC.KEY_NOT_FOUND]: "Requested key not found.",
  [SC.NOT_FOUND]: "Requested data not found.",
  [SC.FIELDS_MISSING]: "Validation failed: required fields are missing.",
  [SC.PARTIAL_SYNC]: "Operational sync incomplete.",
  [SC.MALFORMED_WSS]: "WSS Protocol Error: Unable to parse payload.",
  [SC.INVALID_SESSION]: "Auth Failure: Session invalid.",
  [SC.UNAUTHORIZED_ACCESS]: "Auth Failure: Unauthorized access.",
  [SC.UPSERT_FAIL]: "Persistence Error: Atomic upsert failed.",
  [SC.CURRENCY_MISSING]: "Registry Error: Currency key not found.",
};

/**
 * @description Helper to check if a code is a warning-level success.
 */
export const isWarning = (code: StatusCode): boolean => code >= 1000 && code < 2000;

/**
 * Standardized Response Factory.
 * Generates the internal response object used in IPublishResult.
 */
export const createResponse = (code: StatusCode, context: string, customMessage?: string) => ({
  success: code < 1000,
  code,
  state: Object.keys(SC).find(key => SC[key as keyof typeof SC] === code)?.toLowerCase() || "unknown",
  message: customMessage || StatusMessage[code],
  rows: 0,
  context
});