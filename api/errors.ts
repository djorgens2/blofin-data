/**
 * API error lexicon.
 *
 * @module errors.ts
 * @copyright 2018, Dennis Jorgenson
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
 * Permanent lexicon of error codes for the Account API.
 */
export const enum ErrorCode {
  // 0-999: Success
  SUCCESS = 0,
  
  // 1000-1999: Success with Warnings
  PARTIAL_SYNC_WARNING = 1100,

  // 2000-2999: Client Side (Input)
  MALFORMED_WSS_PAYLOAD = 2001,
  INVALID_ACCOUNT_SESSION = 2100,

  // 4000-4999: Database Specific
  DB_UPSERT_FAILED = 4001,
  DB_CURRENCY_NOT_FOUND = 4002,
}

// Example usage in your Publish function
//if (!currency) {
//  return ApiError(ErrorCode.DB_CURRENCY_NOT_FOUND, "Currency key look-up failed.");
//}
