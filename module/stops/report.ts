//+--------------------------------------------------------------------------------------+
//|                                                                   [stops]  report.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, TResponse } from "#api";
import type { IStopOrder } from "#db";

/**
 * Returns aggregated TResponses grouped by {context, response, success}
 */
export const Summary = (results: (TResponse | undefined | null)[]) => {
  console.error(
    "In Report",
    results.map((r) => console.error(r)),
  );

  const aggregated = results.reduce(
    (acc, curr) => {
      if (!curr) return acc;

      // Create a composite key to group by
      const key = `${curr.context}|${curr.state}|${curr.success}`;

      if (!acc[key]) {
        acc[key] = {
          ...curr, // Use the first occurrence as the template
          rows: curr.rows || 0,
          message: `Aggregated result for ${curr.context}`,
        };
      } else {
        // Aggregate the metrics
        acc[key].rows += curr.rows || 0;
        // We can also append or count outcomes here if needed
      }

      return acc;
    },
    {} as Record<string, TResponse>,
  );

  console.error({aggregated})
  return Object.values(aggregated);
  //  return aggregated;
};

/**
 *
 * Stop Operations Report
 *
 */
export const Report = (results: Array<IPublishResult<IStopOrder>>) => {
  if (!results.length) return;
  console.error("In Stops.Report");

  //--- Import History stats
  const reportHistory = () => {
    const context = "Stops.Import.History";
    const header = results.filter((r) => r.response.context === context);

    if (header.length === 0) return;

    const total = header[0].response;
    const response = results.map((r) => {
      return r.response;
    });

    console.error('History Details', response.length, Object.keys(response[0]))
    const summary = Summary(response);

    console.error(`-> Stops.API: Total Stops retreived: ${total.rows}`);
    console.error(`-> Summary:`, summary);
    // const errors = total.rows - historyPublished;

    // historyPublished && console.log(`   # [Info] Submitted: ${historyPublished}`);
    // historyErrors && console.log(`   # [Error] Rejected: ${historyErrors}`);
  };

  reportHistory();
};

// stat.verified.processed && console.log(`   # [Info] Waiting: ${stat.verified.processed}`);
// stat.verified.expired && console.log(`   # [Warning] Expired: ${stat.verified.expired}`);
// stat.errors && console.log(`   # [Critical] Malformed: ${stat.errors}`);
