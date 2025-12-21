//+--------------------------------------------------------------------------------------+
//|                                                                   [stops]  report.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

export interface TStatistics {
  total: number;
  submitted: {
    success: number;
    rejected: number;
  };
  verified: {
    processed: number;
    expired: number;
  };
  errors: number;
}

// console.log(">> Trades.Canceled: Cancel requests submitted:", cancels.length);
// accepted.length && console.log("   # [Info] Canceled requests accepted:", accepted.length);
// rejected.length && console.log("   # [Error] Canceled requests rejected:", rejected.length);
// closures.length && console.log("   # [Warning] Canceled requests previously closed ():", closures.length);

// console.log(">> [Info] Trades.Rejected: Request retries:", rejects.length);
// accepted.length && console.log("   # [Info] Rejected requests requeued:", accepted.length);
// closures.length && console.log("   # [Warning] Rejected requests closed:", closures.length);
// rejected.length && console.log("   # [Error] Resubmitted requests rejected:", rejected.length);

// console.log(`In Stops.Pending[${requests.length}]`);
// console.log(">> [Info] Trades.Rejected: Request retries:", requests.length);
// pending.length && console.log(">> [Info] Trades.Pending: Requests pending:", pending.length);
// expired.length && console.log(">> [Warning] Trades.Pending: Requests canceled:", expired.length, expired);
//+--------------------------------------------------------------------------------------+
//| handles reporting and statistical output. ***new, may grow this approach             |
//+--------------------------------------------------------------------------------------+
export const Report = (stat: TStatistics) => {
  if (stat.total) {
    console.log(`-> Trades.Queued: Total Requests: ${stat.total}`);
    stat.submitted.success && console.log(`   # [Info] Submitted: ${stat.submitted.success}`);
    stat.submitted.rejected && console.log(`   # [Error] Rejected: ${stat.submitted.rejected}`);
    stat.verified.processed && console.log(`   # [Info] Waiting: ${stat.verified.processed}`);
    stat.verified.expired && console.log(`   # [Warning] Expired: ${stat.verified.expired}`);
    stat.errors && console.log(`   # [Critical] Malformed: ${stat.errors}`);
  }
};
