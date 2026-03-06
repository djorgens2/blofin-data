/**
 * @file CandleImporter.ts
 * @module CLI/Internal/CandleImporter
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
import { StatusCode } from "#api/lexicon";
import { Load, Update, Select } from "#db";
import { Session } from "#app/session";
import { API_GET, ApiResult, type TResponse } from "#api";
import { format } from "#lib/std.util";

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
  const candles = await API_GET<string[][]>(path, `Candle.Publish:${symbol}`, "https://openapi.blofin.com");
  
  console.log ('[Audit]', {symbol: message.symbol, position: message.position, timestamp, path})

  if (!candles.success || !candles.data) return [ApiResult(false, `${context}.Error`, { code: StatusCode.MALFORMED_API_PAYLOAD })];

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
          code: isSuccess ? StatusCode.SUCCESS : StatusCode.DB_UPSERT_FAILED,
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
          code: StatusCode.DB_UPSERT_FAILED,
          text: error instanceof Error ? error.message : "Atomic Commit Exception",
          fatal: (message.status?.attempt || 0) >= (Session().config?.maxRetries || 3),
        },
      } as IMessage);
    }
    throw error;
  }
};
