/**
 * API error lexicon.
 *
 * @module errors.ts
 * @copyright 2018-2026, Dennis Jorgenson
 */

/**
 * The complete and unabridged error dictionary for all Blofin WSS/API endpoints
 *
 * Range        Category            Description
 * 0000 - 0999	Success/Info        Operations that finished as expected (e.g., 0000 for generic OK).
 * 1000 - 1999	Warnings            Completed successfully, but with non-critical issues (e.g., 1102 for "Synced, but some metadata missing").
 * 2000 - 2999	Client Errors       Issues the user can fix (e.g., 2001 for Invalid JSON, 2403 for Permissions).
 * 3000 - 3999	Validation          Specific data errors (e.g., 3105 for Invalid Currency Format).
 * 4000 - 4999	Database (dbError)  Specific DB failures (e.g., 4001 Connection lost, 4022 Deadlock).
 * 5000 - 5999	Critical/System     Unhandled exceptions or external service timeouts.
 */

"use strict";

/**
 * Permanent lexicon of error codes for the WSS, REST API, and Database calls.
 */
/**
 * @file ErrorLexicon.ts
 * @description Standardized C2 Hub Error/Status Codes.
 * Range-bound categorization for the 2026 Engine.
 */

export enum StatusCode {
  // 0-999: Pure Success
  SUCCESS = 0,

  // 1000-1999: Success with Warnings (Informational)
  REQUIRED_FIELDS_MISSING = 1001,
  PARTIAL_SYNC_WARNING = 1100,

  // 2000-2999: Client/Interface Logic Errors (Input)
  MALFORMED_WSS_PAYLOAD = 2001,
  MALFORMED_API_PAYLOAD = 2002,
  INVALID_ACCOUNT_SESSION = 2100,

  // 4000-4999: Persistence Layer (Database)
  DB_UPSERT_FAILED = 4001,
  DB_CURRENCY_NOT_FOUND = 4002,
}

/**
 * @description Type-safe mapping of StatusCodes to their verbose human/log strings.
 */
export const StatusMessage: Record<StatusCode, string> = {
  [StatusCode.SUCCESS]: "Operation completed successfully.",

  [StatusCode.REQUIRED_FIELDS_MISSING]: "Validation failed: 'symbol' and 'timeframe' are mandatory for this operation.",
  [StatusCode.PARTIAL_SYNC_WARNING]: "Operational sync incomplete: check downstream provider heartbeat.",

  [StatusCode.MALFORMED_WSS_PAYLOAD]: "WSS Protocol Error: Unable to parse incoming JSON payload.",
  [StatusCode.MALFORMED_API_PAYLOAD]: "API Protocol Error: Unable to parse incoming JSON payload.",
  [StatusCode.INVALID_ACCOUNT_SESSION]: "Auth Failure: Session expired or token signature invalid.",

  [StatusCode.DB_UPSERT_FAILED]: "Persistence Error: Atomic upsert failed at the machine boundary.",
  [StatusCode.DB_CURRENCY_NOT_FOUND]: "Registry Error: Specified currency key not found in currency.",
};

/**
 * @description Helper to check if a code is a warning-level success.
 */
export const isWarning = (code: StatusCode): boolean => code >= 1000 && code < 2000;

// Example usage in your Publish function
//if (!currency) {
//  return ApiError(ErrorCode.DB_CURRENCY_NOT_FOUND, "Currency key look-up failed.");
//}
