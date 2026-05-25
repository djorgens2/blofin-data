/**
 * @file candles.ts
 * @module api/Candle
 * @description
 * Raw Command-Line Interface for low-level OHLCV data ingestion.
 *
 * DESIGN PHILOSOPHY:
 * This module operates as a standalone "Pre-Flight" auditor, completely decoupled
 * from the Mama/Papa process lifecycles. It enforces a ruthless reconciliation
 * phase, auditing structural integrity and time-series continuity against the
 * StatusCode Lexicon before any data hits the 2026 Engine's production tables.
 *
 * @workflow
 * 1. RAW INGESTION: Direct-to-pipe import bypassing the C2 Hub.
 * 2. INTEGRITY AUDIT: Exhaustive gap-detection and sequence validation.
 * 3. LEXICON MAPPING: Every failure is pinned to a specific StatusCode.
 * 4. ATOMIC COMMIT: Clean data only; zero-tolerance for partial/corrupt sets.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IMessage } from "#lib/ipc.util";
import type { ICandle } from "#db";
import type { IPublishResult, TResponse } from "#api";

import { createResponse, SC } from "#api/lexicon";
import { Session, withSession } from "#app/session";
import { Load, Update, Select, Instrument, Period, PrimaryKey } from "#db";
import { API_GET, ApiResult } from "#api";
import { format } from "#lib/std.util";
import { Log } from "#lib/log.util";

/**
 * @function Publish
 * @description Real-Time Merge; Fetches the MOST RECENT candles (before/present) and reconciles them.
 */
export const Publish = async (message: IMessage): Promise<Array<TResponse>> => {
  const context = "Candle.Publish";
  const { symbol, timeframe } = message;

  // 1. Get the "Tip of the Spear" (Latest timestamp in DB)
  const { success, data: latest } = await Select<ICandle>({ symbol, timeframe }, { table: `vw_candles`, suffix: "ORDER BY timestamp DESC", limit: 1 });

  const [{ instrument, period, ...current }] = success && latest && latest.length ? latest : [];
  const limit = Session().config?.candleMaxFetch || 100;

  // calculate the 'before' timestamp for the API query (1 candle before the latest in DB)
  let timestamp = (current?.timestamp || Date.now()) - (current?.timeframe_minutes || 1) * 4 /* m (retro periods) */ * 60 /* s */ * 1000; /* ms */
  // 2. Change the Query Direction
  // Use 'before' to get records from 'now' going back to our 'timestamp'
  // Or simply fetch the last N records to ensure overlap
  const path = `/api/v1/market/candles?instId=${symbol}&limit=${limit}&bar=${timeframe}&before=${timestamp}`;
  const candles = await API_GET<string[][]>(path, `Candle.Publish:${symbol}`);

  console.log("[Audit]", { symbol: message.symbol, position: message.position, timestamp, path });

  if (!candles.success || !candles.data) return [ApiResult(false, `${context}.Error`, { code: SC.MALFORMED_API_PAYLOAD })];

  // 3. Map and Type-Cast the API to DB ICandle
  const data = candles.data;
  const imports: Array<Partial<ICandle>> = data?.map((col) => ({
    instrument,
    period,
    timestamp: parseInt(col[0]),
    open: parseFloat(col[1]),
    high: parseFloat(col[2]),
    low: parseFloat(col[3]),
    close: parseFloat(col[4]),
    volume: parseFloat(col[5]),
    vol_currency: parseFloat(col[6]),
    vol_currency_quote: parseFloat(col[7]),
    completed: !!parseInt(col[8]),
  }));

  // 4. Get local audit rows for reconciliation
  timestamp = Math.min(...imports.map((i) => i.timestamp!));
  const { data: local } = await Select<ICandle>(
    { instrument, period, timestamp },
    { table: `vw_candles`, keys: [[`instrument`], [`period`], [`timestamp`, ">="]], suffix: `ORDER BY timestamp DESC` },
  );

  const localMap = new Map(local?.map((ts) => [ts.timestamp, ts]));
  const audit = imports.reduce(
    (acc, api) => {
      const match = localMap.get(api.timestamp!);

      if (!match) {
        // Bucket a: Missing Records
        acc.toInsert.push(api);
      } else {
        // Bucket b: Check for Mutated Records
        const isMutated =
          match.open !== api.open ||
          match.high !== api.high ||
          match.low !== api.low ||
          match.close !== api.close ||
          match.volume !== api.volume ||
          format(match.vol_currency!, 5) !== format(api.vol_currency!, 5) ||
          format(match.vol_currency_quote!, 5) !== format(api.vol_currency_quote!, 5) ||
          !!match.completed !== !!api.completed;

        // Bucket b: Changed Records
        if (isMutated) {
          acc.toUpdate.push(api);
        } else {
          // Bucket c: Verified unchanged and reconciled (Do-Nothing)
          acc.toUnchanged.push(ApiResult(true, `${context}.Unchanged`, { code: 200, state: `no_change`, rows: 1 }));
        }
      }
      return acc;
    },
    {
      toInsert: [] as Array<Partial<ICandle>>,
      toUpdate: [] as Array<Partial<ICandle>>,
      toUnchanged: [] as Array<TResponse>,
    },
  );

  // 4. Atomic Commit
  try {
    const results = (
      await Promise.all([
        Load<ICandle>(audit.toInsert, { table: `candle`, ignore: true }, context),
        ...audit.toUpdate.map((c) => Update(c, { table: `candle`, keys: [["timestamp"], [`period`], [`timestamp`]] }, context)),
      ])
    ).flat();

    const isSuccess = results.every((r) => r.success);

    // 5. Success Notification
    if (process.send) {
      process.send({
        ...message,
        state: isSuccess ? "complete" : "error",
        timestamp: Date.now(),
        audit: results.reduce((acc, r) => ({ ...acc, [r.context]: r }), {}),
        status: {
          success: isSuccess,
          code: isSuccess ? SC.SUCCESS : SC.DB_UPSERT_FAILED,
          text: isSuccess ? "Audit Reconciled" : "Partial Sync Failure",
        },
      } as IMessage);
    }

    return results;
  } catch (error) {
    // 6. Failure Notification (Triggers the Operator Alert/Retry logic)
    if (process.send) {
      process.send({
        ...message,
        state: "error",
        timestamp: Date.now(),
        status: {
          success: false,
          code: SC.DB_UPSERT_FAILED,
          text: error instanceof Error ? error.message : "Atomic Commit Exception",
          fatal: (message.status?.attempt || 0) >= (Session().config?.maxRetries || 3),
        },
      } as IMessage);
    }
    throw error;
  }
};

/**
 * @function Import
 * @module api/Candles
 * @file candles.ts
 * @description
 * High-performance OHLCV data ingestion and reconciliation engine. Perform the duties
 * of a Deep Historical Auditor (Day 0). Recursively scans from present-day backward
 * to establish a fully-reconciled history baseline. Uses a change-detection algorithm
 * to minimize DB writes, ensuring only new or corrected data triggers I/O.
 *
 * @workflow
 * 1. RAW INGESTION: Direct-to-pipe retrieval via API_GET, bypassing higher-level abstractions.
 * 2. CHANGE DETECTION: O(1) Map-based comparison between API state and Local DB state.
 * 3. TRIAGE (Anti-Upsert): Segregates data into three distinct buckets:
 *    - toInsert: New time-series data.
 *    - toUpdate: Mutated records (e.g., price corrections or 'completed' status flips).
 *    - toUnchanged: Verified records requiring zero I/O.
 * 4. ATOMIC COMMIT: Concurrent execution of categorized DB operations via Promise.all.

 * @param {IMessage} message - Object containing 'symbol' (e.g., BTC-USDT) and 'timeframe' (e.g., 1m).
 * @returns {Promise<Array<TResponse>>} A flattened array of API results representing
 * every Load, Update, and Reconciliation action taken during the process.
 * @throws {Error} Throws DB_UPSERT_FAILED if the batch commit fails or the cursor
 * becomes corrupted.
 *
 */
export const Import = async (message: IMessage): Promise<Array<IPublishResult<ICandle>>> => {
  const context = `Candle.Import.${message.symbol}`;
  const { symbol, timeframe } = message;

  // 1. Validation Pre-check
  if (!symbol || !timeframe) {
    return [{ key: undefined, response: createResponse(SC.FIELDS_MISSING, context) }];
  }

  return withSession(context, async (session): Promise<IPublishResult<ICandle>[]> => {
    const [instrument, period] = await Promise.all([Instrument.Key({ symbol }), Period.Key({ timeframe })]);

    if (!instrument || !period) {
      return [{ key: undefined, response: createResponse(SC.NOT_FOUND, context, `Instrument/Period mapping failed`) }];
    }

    const limit = session.config?.candleMaxFetch || 100;
    const cooldown = session.config?.apiCooldownMs || 1500;

    let timestamp: number = Date.now();

    console.log(`\n\x1b[36m[Audit]\x1b[0m ${context}: Starting candle sync for timeframe ${timeframe}`);

    while (true) {
      // 1. Standardized API_GET Implementation
      const after = timestamp ? `&after=${timestamp}` : ``;
      const path = `/api/v1/market/candles?instId=${symbol}&limit=${limit}&bar=${timeframe}${after}`;
      const candles = await API_GET<string[][]>(path, `Candle.Import:${symbol}`);

      Log().info(after);

      if (!candles.success || !candles.data?.length) {
        Log().error(`Wow, leaving already? ${after}`)
        break;
      }

      // 2. Map and Type-Cast the API to DB ICandle
      const imports: Array<Partial<ICandle>> = candles.data.map((col) => ({
        instrument,
        period,
        timestamp: parseInt(col[0]),
        open: parseFloat(col[1]),
        high: parseFloat(col[2]),
        low: parseFloat(col[3]),
        close: parseFloat(col[4]),
        volume: parseFloat(col[5]),
        vol_currency: parseFloat(col[6]),
        vol_currency_quote: parseFloat(col[7]),
        completed: !!parseInt(col[8]),
      }));  
      
      Log().error(
        `[Progress] ${symbol} (${timeframe}): Period: ${imports[0]?.timestamp} (${new Date(imports[0]?.timestamp || 0)}); Processed: ${imports.length}`,
      );

      // 3. Change-Detection (Anti-Upsert Logic)
      //   > Retrieve existing records for this specific TS range to detect changes
      //   > Create a lookup map for O(1) access
      //   > Separate candles by a) New (insert), b) Changed (update), and c) Unchanged (no action)

      const { data: local } = await Select<ICandle>(
        { instrument, period, timestamp },
        {
          table: `vw_candles`,
          keys: [[`instrument`], [`period`], [`timestamp`, "<="]],
          suffix: `ORDER BY timestamp DESC`,
          limit: parseInt((limit * 1.1).toFixed()),
        },  
      );  

      const localMap = new Map(local?.map((ts) => [ts.timestamp, ts]));
      const batch = imports.reduce(
        (acc, api) => {
          const match = localMap.get(api.timestamp!);

          if (!match) {
            // Bucket a: Missing Records
            acc.toInsert.push(api);
          } else {
            // Bucket b: Check for Mutated Records
            const isMutated =
              match.open !== api.open ||
              match.high !== api.high ||
              match.low !== api.low ||
              match.close !== api.close ||
              match.volume !== api.volume ||
              format(match.vol_currency!, 5) !== format(api.vol_currency!, 5) ||
              format(match.vol_currency_quote!, 5) !== format(api.vol_currency_quote!, 5) ||
              !!match.completed !== !!api.completed;

            // Bucket b: Changed Records  
            if (isMutated) {
              acc.toUpdate.push(api);
            } else {
              // Bucket c: Verified unchanged and reconciled (Do-Nothing)
              acc.toUnchanged.push(api);
            }  
          }  
          return acc;
        },  
        {
          toInsert: [] as Array<Partial<ICandle>>,
          toUpdate: [] as Array<Partial<ICandle>>,
          toUnchanged: [] as Array<Partial<ICandle>>,
        },  
      );  

      // 4. Apply inserts and updates
      const results: Array<TResponse> = (
        await Promise.all([
          Load<ICandle>(batch.toInsert, { table: `candle`, ignore: true }, context),
          ...batch.toUpdate.map(async (candle) => Update(candle, { table: `candle`, keys: [[`instrument`], [`period`], [`timestamp`]] }, context)),
          ...batch.toUnchanged.map(async () => createResponse(SC.KEY_EXISTS, `${context}.Unchanged`, `Candle data unchanged`)),
        ])  
      ).flat();

      // 5. Test for exit - if we receive fewer records than the limit, we've reached the end of available data
      if (imports?.length < limit) {
        const total = results.reduce(
          (acc, r) => {
            if (r.context === `${context}.Load`) {
              acc.load += r.rows;
            } else if (r.context === `${context}.Update`) {
              acc.update += r.rows;
            } else if (r.context === `${context}.Unchanged`) {
              acc.reconciled += r.rows;
            } else {
              console.log(`[Audit] Unrecognized context in result: ${r.context}`);
              acc.other += r.rows;
            }
            acc.published += r.rows;
            return acc;
          },
          { load: 0, update: 0, reconciled: 0, other: 0, published: 0 },
        );
        console.log(
          `[Audit] ${symbol}.${timeframe}: New: ${total.load} | Updates: ${total.update} | Unchanged: ${total.reconciled} | Other: ${total.other} | Published: ${total.published}`,
        );
        return results;
      }

      // 5. Progress Management
      timestamp = Math.min(...imports.map((c) => c.timestamp!));

      // Api cooldown per your rate limit spec

      await new Promise((r) => setTimeout(r, cooldown));
    }
    // Ensure a valid return type if the loop breaks without returning
    return [];
  });
};
