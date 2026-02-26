/**
 * Market Candle API & Synchronization.
 * 
 * Facilitates the retrieval, transformation, and persistence of market candle data.
 * This module manages the synchronization between the Blofin REST API and the local 
 * 'candle' table, implementing a high-performance "diff-check" to separate new 
 * inserts from necessary historical updates.
 * 
 * @module api/candles
 * @copyright 2018-2026, Dennis Jorgenson
 */
"use strict";

import type { IMessage } from "#lib/app.util";
import type { ICandle } from "#db/interfaces/candle";

import { Candle, Period, Instrument } from "#db";
import { Session } from "#module/session";

import { Select, Load } from "#db";
import { isEqual } from "#lib/std.util";

/**
 * Represents a raw candle record as returned by the Blofin Market API.
 */
export interface ICandleAPI {
  /** Market symbol (e.g., BTC-USDT). */
  symbol?: string;
  /** Unix timestamp in milliseconds. */
  ts: string;
  open: string;
  high: string;
  low: string;
  close: string;
  /** Volume in base asset. */
  vol: string;
  /** Volume in currency. */
  volCurrency: string;
  /** Volume in quote currency. */
  volCurrencyQuote: string;
  /** Confirmation flag ('1' for closed/completed, '0' for partial). */
  confirm: string;
}

/**
 * Standard response structure for Blofin candle queries.
 */
export interface IResult {
  code: string;
  msg: string;
  /** Array of raw string arrays representing candle rows. */
  data: string[][];
}

/**
 * Metadata for a specific instrument and its configured candle timeframe.
 */
interface IInstrumentCandle {
  account: Uint8Array;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  period: Uint8Array;
  timeframe: string;
  timeframe_units: number;
  timestamp: number;
  candle_max_fetch: number;
}

interface ILoaderProps {
  symbol: string;
  timeframe: string;
  startTime: number;
}

/**
 * Internal helper to detect if an API candle differs from a stored DB candle.
 * 
 * Compares OHLCV data and confirmation status. Uses a precision-weighted 
 * equality check for floating point currency volumes.
 * 
 * @param apiCandle - The newly fetched candle from the exchange.
 * @param dbCandle - The existing record retrieved from local storage.
 * @returns True if any critical price or volume data has changed.
 */
const isChanged = (apiCandle: Partial<ICandle>, dbCandle: Partial<ICandle>): boolean => {
  const changed = !(
    isEqual(apiCandle.open!, dbCandle.open!) &&
    isEqual(apiCandle.high!, dbCandle.high!) &&
    isEqual(apiCandle.low!, dbCandle.low!) &&
    isEqual(apiCandle.close!, dbCandle.close!) &&
    isEqual(apiCandle.volume!, dbCandle.volume!) &&
    isEqual(apiCandle.vol_currency!, dbCandle.vol_currency!, 5) &&
    isEqual(apiCandle.vol_currency_quote!, dbCandle.vol_currency_quote!, 5) &&
    !!apiCandle.completed === !!dbCandle.completed
  );
  return changed;
};

/**
 * Aggregates, formats, and categorizes API data for bulk persistence.
 * 
 * This method maps raw API strings to typed numbers, performs a look-ahead 
 * history fetch to build a local map, and partitions the incoming data into 
 * 'inserts' (new timestamps) and 'updates' (existing timestamps with changed data).
 * 
 * @param props - Metadata containing instrument and period identifiers.
 * @param api - The raw list of candles returned from the exchange.
 * @returns Categorized sets of candle records ready for the DB layer.
 */
const publish = async (props: Partial<ICandle>, api: Array<ICandleAPI>) => {
  if (api.length) {
    api.length > 5 && console.log(`-> Candle.Publish [API]: ${api[0].symbol} / ${api.length}`);

    const { instrument, period } = props;
    const candles: Array<Partial<ICandle>> = api.map((c: ICandleAPI) => {
      return {
        instrument,
        period,
        timestamp: parseInt(c.ts),
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseInt(c.vol),
        vol_currency: parseFloat(c.volCurrency),
        vol_currency_quote: parseFloat(c.volCurrencyQuote),
        completed: !!parseInt(c.confirm),
      };
    });

    const limit = Session().config?.candleMaxFetch || 100;
    const dbBatch = (await Candle.History({ ...props, timestamp: candles[0].timestamp, limit})) ?? [];
    const dbCandleMap = new Map<number, Partial<ICandle>>();

    dbBatch.forEach((c) => dbCandleMap.set(c.timestamp!, c));

    const categorized = candles.reduce(
      (acc, apiCandle) => {
        const existingDbCandle = dbCandleMap.get(apiCandle.timestamp!);

        if (existingDbCandle) {
          if (isChanged(apiCandle, existingDbCandle)) {
            acc.updates.push(apiCandle);
          }
        } else {
          acc.inserts.push(apiCandle);
        }
        return acc;
      },
      { inserts: [] as Array<Partial<ICandle>>, updates: [] as Array<Partial<ICandle>> },
    );

    return {
      size: candles.length,
      inserts: categorized.inserts,
      updates: categorized.updates,
    };
  } else return { size: 0, inserts: [], updates: [] };
};

/**
 * Orchestrates the full synchronization flow for an instrument's candles.
 * 
 * 1. Resolves instrument metadata from 'vw_instrument_candles'.
 * 2. Fetches raw candle data from the Blofin REST API using dynamic timeframes.
 * 3. Categorizes data into batch inserts and individual updates.
 * 4. Executes DB persistence and notifies the parent process via receipt.
 * 
 * @param message - The instruction message containing the symbol and timeframe to sync.
 * @returns A receipt containing DB operation counts (inserts/updates).
 * @throws Error if the instrument is unconfigured or the API returns a bad response.
 */
export const Publish = async (message: IMessage) => {
  const instrument = await Select<IInstrumentCandle>(
    { account: Session().account, symbol: message.symbol, timeframe: message.timeframe },
    { table: "vw_instrument_candles" },
  );

  if (instrument.success && instrument.data?.length) {
    const [current] = instrument.data;

    try {
      const { instrument, symbol, period, timeframe, timeframe_units, timestamp, candle_max_fetch } = current;
      const keys = { instrument, period };
      const start = `&before=${timestamp! - 3 * timeframe_units! * 60 * 1000}`;
      const response = await fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${symbol}&limit=${candle_max_fetch}&bar=${timeframe}${start}`);

      if (response.ok) {
        const json = await response.json();
        const result: IResult = json;
        if (result.data.length > 0) {
          const api: ICandleAPI[] = result.data.map((c: string[]) => ({
            symbol,
            ts: c[0],
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            vol: c[5],
            volCurrency: c[6],
            volCurrencyQuote: c[7],
            confirm: c[8],
          }));

          const published = await publish(keys, api);
          published.inserts.length && (await Load<ICandle>(published.inserts, { table: `candle` }));
          const promises = published.updates.map((update) => Candle.Publish(update));
          await Promise.all(promises);

          const receipt = { ...message, db: { insert: published.inserts.length, update: published.updates.length } };
          process.send && process.send(receipt);
          return receipt;
        }
      } else throw new Error(`Bad response from candle fetch: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log("Bad request in Candles.Import", { response: error });
    }
  } else throw new Error(`Unathorized fetch request; instrument ${message.symbol} not configured for account ${Session().alias}`);
};

/**
 * Executes a full historical data synchronization for a specific instrument.
 * 
 * Unlike the 'Publish' method which handles delta-syncs, 'Import' performs a 
 * deep-history fetch. It recursively paginates backwards through the Blofin 
 * REST API using the 'after' parameter until no further data is returned.
 * 
 * Key Features:
 * - Recursive Pagination: Updates `startTime` based on the oldest candle in each batch.
 * - Throttling: Implements a 1500ms delay between requests to respect API rate limits.
 * - Persistence: Combines bulk `Load` operations for new data with `Promise.allSettled` 
 *   for historical updates to ensure maximum throughput without blocking.
 * 
 * @async
 * @param message - The control message containing routing and context information.
 * @param props - Configuration for the loader, including symbol, timeframe, and anchor startTime.
 * @returns A cumulative receipt of all insertions and updates performed during the session.
 * @throws Error if the instrument or period keys cannot be resolved from the database.
 */
export const Import = async (message: IMessage, props: ILoaderProps) => {
  const { symbol, timeframe } = props;
  
  // Resolve primary keys for relational integrity
  const [instrument, period] = await Promise.all([
    Instrument.Key({ symbol }), 
    Period.Key({ timeframe })
  ]);
  
  const limit = Session().config?.candleMaxFetch || 100;

  if (instrument && period) {
    console.log(`Loader start for ${symbol} after ${props.startTime} on ${new Date().toISOString()}`);
    console.log(`-> [Info] Session.Config:`, { 
      account: Session().account, 
      alias: Session().alias, 
      candleMaxFetch: limit 
    });

    const receipt = { ...message, db: { insert: 0, update: 0 } };
    const keys = { instrument, period };

    // Continuous pagination loop
    while (true) {
      console.log(`Fetching candles for ${symbol} after [${props.startTime}, ${new Date(props.startTime).toISOString()}]`);

      const after = props.startTime ? `&after=${props.startTime}` : "";

      try {
        const response = await fetch(
          `https://openapi.blofin.com/api/v1/market/candles?instId=${symbol}&limit=${limit}&bar=${timeframe}${after}`
        );

        if (response.ok) {
          const json = await response.json();
          const result: IResult = json;

          if (result.data.length > 0) {
            // Map raw string arrays to typed Candle API interface
            const api: ICandleAPI[] = result.data.map((c: string[]) => ({
              symbol,
              ts: c[0],
              open: c[1],
              high: c[2],
              low: c[3],
              close: c[4],
              vol: c[5],
              volCurrency: c[6],
              volCurrencyQuote: c[7],
              confirm: c[8],
            }));

            // Diff against DB and prepare batches
            const published = await publish(keys, api);
            
            // Move the cursor to the oldest timestamp received for the next iteration
            props.startTime = Math.min(...api.map((c) => parseInt(c.ts)));

            // Execute Updates
            if (published.updates.length) {
              await Promise.allSettled(published.updates.map((update) => Candle.Publish(update)));
              receipt.db.update += published.updates.length;
            }
            
            // Execute Batch Inserts
            if (published.inserts.length) {
              await Load<ICandle>(published.inserts, { table: `candle` });
              receipt.db.insert += published.inserts.length;
            }
          } else {
            // Exit loop: No more data returned from API
            process.send && process.send(receipt);
            return receipt;
          }
        } else {
          throw new Error(`Bad response from candle fetch: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`Loader error for ${symbol} after ${props.startTime} on ${new Date().toISOString()}`);
        return { ...message, text: (error as Error).message } as IMessage;
      }

      // API Rate Limit Mitigation (1.5s backoff)
      await new Promise((r) => setTimeout(r, 1500));
    }
  } else {
    throw new Error(`Critical: Could not resolve instrument/period keys for ${symbol}/${timeframe}`);
  }
};
