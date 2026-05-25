/**
 * @module Universal-Seed-Hydrator
 * @description Scans and synchronizes JSON-based state manifests into the local database.
 *
 * Supports dynamic key generation (hashkey) and format conversion (hexify)
 * during the hydration process.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TResponse } from "#api";
import type { TRefKey } from "#db";
import type { ILogger } from "#lib/log.util";

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { hashKey, hexify } from "#lib/crypto.util";
import { ApiResult } from "#api";
import { Load } from "#db";

import * as Reference from "#db/interfaces/reference";

/**
 * Manifest Structure Interface
 */
interface ISeedManifest {
  pkey: string;
  keylen?: number;
  resolver?: "hashkey" | "hexify" | "none";
  refers?: [string, string]; // e.g., { "account": "account_id" }
  lookup?: { column: string; table: string; key: any };
  data: any[];
}

/**
 * Dynamically discovers and loads all JSON seed manifests from a directory.
 *
 * @async
 * @param {string} seedFilePath - Relative path to the directory containing .json manifests.
 * @param {string} [context] - Optional logging context.
 * @returns {Promise<TResponse>} Standard API Result with hydration metrics.
 */
export const Loader = async (seedFilePath = "./", baseContext = "Seed", log?: ILogger): Promise<TResponse> => {
  const context = `Loader.${baseContext}`;

  // Resolve absolute path for Node 22 ESM compatibility
  const seedDirPath = fileURLToPath(new URL(seedFilePath, import.meta.url));

  try {
    const files = await readdir(seedDirPath);
    const manifests = files.filter((f) => f.endsWith(".json")).sort(); // Sort ensures deterministic load order
    const resolutionCache = new Map<string, TRefKey>();

    log?.info(`Initializing System Hydration [${manifests.length} files]`);

    for (const fileName of manifests) {
      const filePath = new URL(`${seedFilePath}${fileName}`, import.meta.url);
      const rawData = await readFile(filePath, "utf8");
      const fileData: Record<string, ISeedManifest> = JSON.parse(rawData);

      for (const [tableName, manifest] of Object.entries(fileData)) {
        const { pkey, keylen, resolver, refers, lookup, data } = manifest;
        const [refTable, refField] = refers || [];

        if (refTable && refField) {
          log?.info(`   # [${fileName}] -> ${tableName}: Resolving referential integrity for ${refTable}.${refField}...`);
          const refData = await Reference.Fetch({}, { table: refTable });
          if (refData && refData.length === 0) {
            log?.error(`   ⚠️ Referential data missing for ${refTable}. Skipping ${tableName} hydration.`);
            continue;
          }
          // Cache reference data for quick lookup during transformation
          refData?.forEach((row: any) => resolutionCache.set(row[refField], row[refTable]));
        }

        const lookupResult = lookup ? await Reference.Fetch(lookup.key, { table: lookup.table }) : undefined;
        const lookupColumn = lookupResult ? Object.entries(lookupResult[0]).find(([key]) => key === lookup?.column) : undefined;
        const addColumn = lookupColumn ? { [lookupColumn[0]]: lookupColumn[1] } : undefined;

        // Transformation Layer (The 'T' in ETL)
        const hydrated = data.map((row: any) => {
          // If field is missing and resolver is hashkey, generate new binary ID
          if (resolver === "hashkey") {
            row[pkey] = row[pkey] ? hexify(row[pkey]) : hashKey(keylen || 32);
          }
          // If field exists but needs hex conversion (e.g. from JSON string to Buffer)
          else if (resolver === "hexify" && row[pkey]) {
            row[pkey] = hexify(row[pkey]);
          }

          if (refers) {
            const resolvedKey = resolutionCache.get(row[refTable!]);
            if (resolvedKey) {
              return { ...row, [refTable!]: resolvedKey! };
            } else {
              log?.error(`   ⚠️ Failed to resolve Primary Key for [${row[refTable!]}] in ${refTable}`);
              return row;
            }
          }
          return { ...row, ...addColumn };
        });

        // Loading Layer (The 'L' in ETL)
        const result = await Load(hydrated, { table: tableName, ignore: true });

        if (result.rows > 0) {
          log?.success(`   # [${fileName}] -> ${tableName}: ${result.rows} new records added.`);
        } else {
          log?.info(`   # [${fileName}] -> ${tableName}: Verified (No changes).`);
        }
      }
    }

    log?.info(`✅ Universal hydration complete.`)
    return ApiResult(true, context, { message: "Universal hydration complete." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "FS_SCAN_ERROR";
    log?.error(`⚠️ Hydration Failed: ${msg}`);
    return ApiResult(false, context, { message: `Hydration failed: ${msg}` });
  }
};
