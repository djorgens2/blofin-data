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
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { hashKey, hexify } from "#lib/crypto.util";
import { ApiResult } from "#api";
import { Load, type TRefKey } from "#db";
import { cyan, green, yellow, red, bold } from "console-log-colors";
import * as Reference from "#db/interfaces/reference";

/**
 * Manifest Structure Interface
 */
interface ISeedManifest {
  pkey: string;
  keylen?: number;
  resolver?: "hashkey" | "hexify" | "none";
  refers?: [string, string]; // e.g., { "account": "account_id" }
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
export const Loader = async (seedFilePath = "./", context?: string): Promise<TResponse> => {
  const logContext = `Loader${context ? `.${context}` : ""}`;

  // Resolve absolute path for Node 22 ESM compatibility
  const seedDirURL = new URL(seedFilePath, import.meta.url);
  const seedDirPath = fileURLToPath(seedDirURL);

  try {
    const files = await readdir(seedDirPath);
    const manifests = files.filter((f) => f.endsWith(".json")).sort(); // Sort ensures deterministic load order
    const resolutionCache = new Map<string, TRefKey>();

    console.log(bold(cyan(`\n[Boot] ${logContext}:Initializing System Hydration...`)));

    for (const fileName of manifests) {
      const filePath = new URL(`${seedFilePath}${fileName}`, import.meta.url);
      const rawData = await readFile(filePath, "utf8");
      const fileData: Record<string, ISeedManifest> = JSON.parse(rawData);

      for (const [tableName, manifest] of Object.entries(fileData)) {
        const { pkey, keylen, resolver, refers, data } = manifest;
        const [refTable, refField] = refers || [];

        if (refTable && refField) {
          console.log(`   # [${fileName}] -> ${tableName}: Resolving referential integrity for ${refTable}.${refField}...`);
          const refData = await Reference.Fetch({}, { table: refTable });
          if (refData && refData.length === 0) {
            console.warn(red(`   ! Referential data missing for ${refTable}. Skipping ${tableName} hydration.`));
            continue;
          }
          // Cache reference data for quick lookup during transformation
          refData?.forEach((row: any) => resolutionCache.set(row[refField], row[refTable]));
        }

        // Transformation Layer (The 'T' in ETL)
        const hydrated = data.map((row: any) => {
          // If field is missing and resolver is hashkey, generate new binary ID
          if (resolver === "hashkey" && !row[pkey]) {
            row[pkey] = hashKey(keylen || 32);
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
              console.warn(yellow(`      ! Failed to resolve UPC for [${row[refTable!]}] in ${refTable}`));
              return row;
            }
          }
          return row;
        });

        // Loading Layer (The 'L' in ETL)
        const result = await Load(hydrated, { table: tableName, ignore: true });

        if (result.rows > 0) {
          console.log(green(`   # [${fileName}] -> ${tableName}: ${result.rows} new records added.`));
        } else {
          console.log(`   # [${fileName}] -> ${tableName}: Verified (No changes).`);
        }
      }
    }

    return ApiResult(true, logContext, { message: "Universal hydration complete." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "FS_SCAN_ERROR";
    console.error(red(`\n[Critical] Hydration Failed: ${msg}`));
    return ApiResult(false, logContext, { message: `Hydration failed: ${msg}` });
  }
};
