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
import { Load } from "#db";
import { cyan, green, red, bold } from "console-log-colors";

/**
 * Manifest Structure Interface
 */
interface ISeedManifest {
  pkey: string;
  keylen?: number;
  resolver?: "hashkey" | "hexify" | "none";
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

    console.log(bold(cyan(`\n[Boot] ${logContext}:Initializing System Hydration...`)));

    for (const fileName of manifests) {
      const filePath = new URL(`${seedFilePath}${fileName}`, import.meta.url);
      const rawData = await readFile(filePath, "utf8");
      const fileData: Record<string, ISeedManifest> = JSON.parse(rawData);

      for (const [tableName, manifest] of Object.entries(fileData)) {
        const { pkey, keylen, resolver, data } = manifest;

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
