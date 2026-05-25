/**
 * API-to-Database Synchronization for Instrument Positions.
 *
 * Orchestrates the fetching of global instruments, retrieving account-specific
 * leverage for those instruments, and persisting the merged state to the local DB.
 *
 * @module api/instrumentPositions
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult, IInstrumentAPI, ILeverageAPI } from "#api";
import type { IInstrumentPosition } from "#db";

import { Instrument, InstrumentPosition } from "#db";
import { Leverages, Instruments } from "#api";
import { withSession } from "#app/session";
import { Log } from "#lib/log.util";

/** Combined type representing raw API instrument data merged with leverage settings. */
export type TInstrumentLeverage = ILeverageAPI & Partial<IInstrumentAPI>;

// --- Private Functions ---

/**
 * Segments an array of instruments into smaller chunks to respect broker rate limits.
 *
 * @param props - The full list of instruments to batch.
 * @param batchSize - Maximum items per batch (default: 20).
 */
const createBatches = (props: Array<Partial<IInstrumentAPI>>, batchSize = 20) => {
  const batches = [];
  for (let i = 0; i < props.length; i += batchSize) {
    batches.push(props.slice(i, i + batchSize));
  }
  return batches;
};

/**
 * Performs a left-join between leverage settings and instrument definitions.
 *
 * @param instruments - Array of base instrument data from the exchange.
 * @param leverages - Array of leverage settings for the specific account.
 * @returns A merged array of {@link TInstrumentLeverage}.
 */
const merge = (instruments: Partial<IInstrumentAPI>[], leverages: ILeverageAPI[]): TInstrumentLeverage[] => {
  const instrumentMap = new Map<string, Partial<IInstrumentAPI>>();
  for (const item of instruments) {
    item.instId && instrumentMap.set(item.instId, item);
  }

  const mergedData: TInstrumentLeverage[] = leverages.map((leverageItem) => {
    const matchingInstrument = instrumentMap.get(leverageItem.instId);
    if (!matchingInstrument) {
      console.warn(`No matching instrument found for instId: ${leverageItem.instId}`);
    }

    return {
      ...(matchingInstrument || {}),
      ...leverageItem,
    };
  });

  return mergedData;
};

/**
 * Iterates through merged API data and persists it to the local `instrument_position` table.
 *
 * @param props - The merged instrument and leverage data.
 * @returns An array of results for each database publish operation.
 */
const publish = async (account: Uint8Array, context: string, props: Array<TInstrumentLeverage>): Promise<Array<IPublishResult<IInstrumentPosition>>> => {
  context = context + `.Publish (internal)`;
  if (!props.length) {
    return [
      {
        key: undefined,
        response: {
          success: false,
          code: 404,
          state: `not_found`,
          message: `[Error] ${context}: No data found`,
          rows: 0,
          context,
        },
      },
    ];
  }

  const results = (
    await Promise.all(
      props.map(async (prop) => {
        const instrument = await Instrument.Key({ account, symbol: prop.instId });

        if (!instrument) {
          return undefined;
        }

        const instrument_position: Partial<IInstrumentPosition> = {
          instrument,
          position: prop.positionSide,
          leverage: parseInt(prop.leverage),
          update_time: new Date(),
        };
        return InstrumentPosition.Publish(instrument_position);
      }),
    )
  ).filter((row): row is IPublishResult<IInstrumentPosition> => !!row);

  Log().info(`-> ${context}: Positions published (${results.length})`);

  return results;
};

// --- Public Functions ---

/**
 * Main entry point for synchronizing exchange instrument position data and leverages with the local database.
 *
 * Logic flow:
 * 1. Verifies session is logged in and valid.
 * 2. Fetches all available instruments from the broker.
 * 3. Batches instruments and fetches specific leverage settings for each.
 * 4. Merges instrument and leverage data.
 * 5. Publishes the final state to the local DB via {@link publish}.
 *
 * @returns A promise resolving to the collection of publish results.
 */
export const Import = async (): Promise<Array<IPublishResult<IInstrumentPosition>>> => {
  const context = "Instrument.Position.Import";

  // The wrapper handles the "Unauthorized" error response automatically
  return withSession(context, async (session) => {
    
    /** 2. Fetch all instruments from the broker API */
    const { success, data } = await Instruments.Fetch();

    if (!success || !data?.length) {
      return [{ key: undefined, response: { success: false, code: 404, state: `not_found`, message: `[Error] ${context}:`, rows: 0, context } }];
    }

    Log().info(`-> ${context}`);

    // Access session properties safely (e.g., config, margin_mode, account)
    const batches = createBatches(data, session.config?.leverageMaxFetch);
    
    const merged = batches.map(async (batch) => {
      const symbols = batch.map((i: Partial<IInstrumentAPI>) => i.instId).join(",");
      const leverages = (await Leverages.Import([{ 
        symbol: symbols, 
        margin_mode: session.margin_mode 
      }])) as Array<ILeverageAPI> ?? [];
      
      return merge(batch, leverages);
    });

    const positions = await Promise.all(merged);

    // No need for type casting; session.account is guaranteed here
    return await publish(session.account, context, positions.flat() satisfies Array<TInstrumentLeverage>);
  });
};
