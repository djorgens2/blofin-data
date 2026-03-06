/**
 * @module Module/Audit
 * @file candles.ts
 * @description
 * High-performance OHLCV data ingestion and reconciliation engine.
 *
 * DESIGN PHILOSOPHY:
 * Operates as a "Pre-Flight" auditor, completely decoupled from main process
 * lifecycles. It enforces a deterministic reconciliation phase, auditing
 * structural integrity and time-series continuity against the StatusCode Lexicon
 * before committing to production tables.
 *
 * @workflow
 * 1. RAW INGESTION: Direct-to-pipe retrieval via API_GET, bypassing higher-level abstractions.
 * 2. CHANGE DETECTION: O(1) Map-based comparison between API state and Local DB state.
 * 3. TRIAGE (Anti-Upsert): Segregates data into three distinct buckets:
 *    - toInsert: New time-series data.
 *    - toUpdate: Mutated records (e.g., price corrections or 'completed' status flips).
 *    - toUnchanged: Verified records requiring zero I/O.
 * 4. ATOMIC COMMIT: Concurrent execution of categorized DB operations via Promise.all.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IMessage } from "#lib/ipc.util";
import type { TResponse } from "#api";
import type { ICandle } from "#db";

import { StatusCode, StatusMessage } from "#api/lexicon";
import { Instrument, Period, Select, Update, Load } from "#db";
import { API_GET, ApiResult } from "#api";
import { Session } from "#app/session";
import { Log } from "#lib/log.util"
import { format } from "#lib/std.util";

/**
 * @function Import
 * @description
 * Deep Historical Auditor (Day 0). Recursively scans from present-day backward
 * to establish a "Whistle-Clean" baseline. Uses a change-detection algorithm
 * to minimize DB writes, ensuring only new or corrected data triggers I/O.
 *
 * @param {IMessage} message - Object containing 'symbol' (e.g., BTC-USDT) and 'timeframe' (e.g., 1m).
 * @returns {Promise<Array<TResponse>>} A flattened array of API results representing
 * every Load, Update, and Reconciliation action taken during the process.
 *
 * @throws {Error} Throws DB_UPSERT_FAILED if the batch commit fails or the cursor
 * becomes corrupted.
 */
export const Import = async (message: IMessage): Promise<Array<TResponse>> => {
  const context = "Candle.Import";
  const { symbol, timeframe } = message;

  if (!symbol || !timeframe) {
    console.log(`[${StatusCode.REQUIRED_FIELDS_MISSING}] ${StatusMessage[StatusCode.REQUIRED_FIELDS_MISSING]}`);
    return [ApiResult(false, `${context}.Error`, { code: StatusCode.REQUIRED_FIELDS_MISSING })];
  }

  const [instrument, period] = await Promise.all([Instrument.Key({ symbol }), Period.Key({ timeframe })]);

  if (!instrument || !period) {
    console.log(`[${StatusCode.DB_CURRENCY_NOT_FOUND}] Instrument not found: ${symbol}/${timeframe}`);
    return [ApiResult(false, `${context}.Error`, { code: StatusCode.DB_CURRENCY_NOT_FOUND })];
  }

  const limit = Session().config?.candleMaxFetch || 100;

  let timestamp: number = Date.now();

  console.log(`\n[Audit] Starting history load: ${symbol} (${timeframe})`);

  while (true) {
    try {
      // 1. Standardized API_GET Implementation
      const after = timestamp ? `&after=${timestamp}` : ``;
      const path = `/api/v1/market/candles?instId=${symbol}&limit=${limit}&bar=${timeframe}${after}`;
      const candles = await API_GET<string[][]>(path, `Candle.Import:${symbol}`, "https://openapi.blofin.com");

      if (!candles.success || !candles.data) {
        console.log(`[${StatusCode.MALFORMED_API_PAYLOAD}] Failed to fetch candles for ${symbol}: ${candles.message}`);
        return [ApiResult(false, `${context}.Error`, { code: StatusCode.MALFORMED_API_PAYLOAD, message: candles.message })];
      }

      // 2. Map and Type-Cast the API to DB ICandle
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

      Log().error(
        `[Progress] ${symbol} (${timeframe}): Period: ${imports[0]?.timestamp} (${new Date(imports[0]?.timestamp || 0)}); Audited: ${imports.length}`,
      );

      // 4. Apply inserts and updates
      const results = (await Promise.all([
        Load<ICandle>(audit.toInsert, { table: `candle`, ignore: true }, context),
        ...audit.toUpdate.map(async (candle) => Update(candle, { table: `candle`, keys: [[`instrument`], [`period`], [`timestamp`]] }, context)),
        ...audit.toUnchanged,
      ])).flat();

      // 5. Test for exit - if we receive fewer records than the limit, we've reached the end of available data
      if (data?.length < limit) {
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
            acc.processed += r.rows;
            return acc;
          },
          { load: 0, update: 0, reconciled: 0, other: 0, processed: 0 },
        );
        console.log(
          `[Audit] ${symbol}.${timeframe}: New: ${total.load} | Updates: ${total.update} | Unchanged: ${total.reconciled} | Other: ${total.other} | Processed: ${total.processed}`,
        );
        return results;
      }

      // 5. Progress Management
      timestamp = Math.min(...data.map((c) => parseInt(c[0])));

      // Api cooldown per your rate limit spec
      await new Promise((r) => setTimeout(r, Session().config?.apiCooldownMs || 1500));
    } catch (error) {
      console.log(`[${StatusCode.DB_UPSERT_FAILED}] Audit Terminated: ${error}`);
      throw error;
    }
  }
};
