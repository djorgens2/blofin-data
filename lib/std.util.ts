/**
 * @file std.util.ts
 * @module StandardUtilities
 * @description
 * Core runtime utility suite for the 2026 Trading Engine. Provides data normalization,
 * high-precision comparison (Decimal.js), binary-to-hex string formatting,
 * and timeframe-based date arithmetic.
 *
 * Also contains logic for numeric comparisons, string manipulation, and 2026-compliant
 * file I/O. Includes specialized CSV serialization for trading audits.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */


"use strict";

import { hexify } from "#lib/crypto.util";

import Prompt from "#cli/modules/Prompts";
import Decimal from "decimal.js";

import * as fs from "node:fs";

/**
 * Standard USD Currency Formatter.
 * Uses the Intl.NumberFormat API for locale-aware currency strings.
 * @constant formatterUSD
 */
export const formatterUSD = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Pauses CLI execution and awaits user confirmation via an interactive prompt.
 *
 * @async
 * @function Pause
 * @param {string} message - The prompt message to display to the user.
 * @returns {Promise<void>} Resolves on 'continue', terminates process on 'exit'.
 */
export const Pause = async (message: string) => {
  const { choice } = await Prompt(["choice"], { message, active: "continue", inactive: "exit", initial: true });
  if (!choice) process.exit(0);
};

/**
 * Converts a Uint8Array (Buffer) into a standardized hex string.
 *
 * @function hexString
 * @param {Uint8Array} uint8Array - The binary data to convert.
 * @param {number} length - The total desired length of the hex portion (for padding).
 * @param {string} [prefix="0x"] - Optional string prefix (default: 0x).
 * @returns {string} Formatted hex string (e.g., "0x00c0ffee").
 */
export const hexString = (uint8Array: Uint8Array, length: number, prefix = "0x"): string => {
  if (uint8Array instanceof Uint8Array) {
    const hex = Array.from(uint8Array)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return prefix + hex.padStart(length, "0");
  }
  return `${prefix}`;
};

/**
 * Converts a Uint8Array into a Node.js style buffer string representation.
 *
 * @function bufferString
 * @param {Uint8Array} uint8Array - Binary data to format.
 * @returns {string} Formatted string (e.g., "<Buffer c0 ff ee>").
 */
export const bufferString = (uint8Array: Uint8Array): string => {
  const hex = Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return `<Buffer ${hex}>`;
};

/**
 * RegEx pattern identifying database fields that must be stored as binary buffers.
 * Matches keys ending in _id, account, request, instrument, etc.
 * @constant HEX_FIELD_PATTERN
 */
const HEX_FIELD_PATTERN = /(_id|account|request|instrument|state|category|source|position)$/i;

/**
 * Recursively scans an object and converts string identifiers into Uint8Arrays (Buffers).
 * Essential for normalizing JSON data before database ingestion.
 *
 * @function NormalizeHex
 * @template T
 * @param {T} props - The object to normalize.
 * @returns {T} A shallow copy of the object with identified fields hexified.
 */
export const NormalizeHex = <T extends object>(props: T): T => {
  const output = { ...props };

  (Object.keys(output) as Array<keyof T>).forEach((key) => {
    const val = output[key];
    const keyStr = String(key);
    if (typeof val === "string" && val.length > 0) {
      if (HEX_FIELD_PATTERN.test(keyStr) || val.startsWith("0x")) {
        output[key] = hexify(val) as any;
      }
    }
  });

  return output;
};

/**
 * Safe JSON parser with whitelisted exceptions for non-standard exchange messages.
 *
 * @function parseJSON
 * @template T
 * @param {arg} arg - The string to attempt to parse.
 * @returns {Required<T> | undefined} Parsed object or undefined on failure.
 * @throws {Error} If the string is not valid JSON and not a whitelisted exception.
 */
export const parseJSON = <T extends object>(arg: string): Required<T> | undefined => {
  try {
    const json = JSON.parse(arg);

    if (typeof json === "object" && json !== null) {
      const obj: Required<T> = { ...json };
      return obj;
    }
  } catch (e) {
    // Whitelist: Handle raw WSS heartbeats or empty objects
    if (arg === "pong") return { event: "pong" } as any;
    if (arg === `{""}`) return {} as any;

    throw new Error(`Critical JSON Parse Error: [${arg}] is not valid.`);
  }
  return undefined;
};

/**
 * Calculates a future Date object based on a timeframe period string.
 *
 * @function setExpiry
 * @param {string} period - Timeframe string (e.g., "15s", "1h", "1d").
 * @param {Date} [from] - Base date (defaults to now).
 * @returns {Date} The calculated expiration date.
 */
export const setExpiry = (period: string, from?: Date) => {
  const expiry = from || new Date();
  const timeframe = period.slice(-1);
  const units = parseInt(period) * (timeframe === "s" ? 1000 : timeframe === "m" ? 60000 : timeframe === "h" ? 3600000 : timeframe === "d" ? 86400000 : 0);
  return new Date(expiry.getTime() + units);
};

/**
 * Returns a high-resolution 24h time string including milliseconds.
 * Useful for precise audit logging in the 2026 engine.
 *
 * @function timeString
 * @returns {string} Format: HH:MM:SS.mmm
 */
export const timeString = () => {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
  return time;
};

/**
 * REFACTORED: High-precision corridor check using Decimal.js.
 * Eliminates IEEE 754 noise by comparing values as fixed-precision strings.
 * 
 * @function isBetween
 * @param {number | string} source - The value to check (e.g., Current Price).
 * @param {number | string} bound1 - Corridor Boundary A (e.g., Upper Envelope).
 * @param {number | string} bound2 - Corridor Boundary B (e.g., Lower Envelope).
 * @param {boolean} [inclusive=true] - If true, returns true if source matches a boundary.
 * @param {number} [digits=8] - Precision to normalize before comparison.
 * @returns {boolean} True if the source is within the specified price corridor.
 */
export const isBetween = (
  source: number | string,
  bound1: number | string,
  bound2: number | string,
  inclusive = true,
  digits: number = 8
): boolean => {
  try {
    // 1. Normalize all inputs to fixed-point Decimals
    const s = new Decimal(source).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
    const b1 = new Decimal(bound1).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
    const b2 = new Decimal(bound2).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);

    // 2. Identify High/Low boundaries
    const high = Decimal.max(b1, b2);
    const low = Decimal.min(b1, b2);

    // 3. Comparison Logic (No native JS float operators used)
    if (inclusive) {
      // (low <= source <= high)
      return s.greaterThanOrEqualTo(low) && s.lessThanOrEqualTo(high);
    } else {
      // (low < source < high)
      return s.greaterThan(low) && s.lessThan(high);
    }
  } catch (e) {
    console.error("[Error] std.util.isBetween: Invalid numeric input", { source, bound1, bound2 });
    return false;
  }
};

/**
 * Performs a high-precision equality comparison across multiple data types.
 * Utilizes Decimal.js for floating-point accuracy to avoid JS rounding errors.
 *
 * @function isEqual
 * @type {ComparableValue} number | string | Uint8Array | Date | Decimal
 * @param {ComparableValue} source - Primary value.
 * @param {ComparableValue} benchmark - Value to compare against.
 * @param {number} [digits=8] - Precision for numeric comparisons.
 * @param {boolean} [log=false] - Enable console logging for debugging.
 * @returns {boolean} True if values match at the specified precision.
 */
type ComparableValue = number | string | Uint8Array | Date | Decimal;
export const isEqual = (source: ComparableValue, benchmark: ComparableValue, digits: number = 8): boolean => {
  if (source == null && benchmark == null) return true;
  if (source == null || benchmark == null) return false;

  // 1. Binary Comparison (Uint8Array)
  if (source instanceof Uint8Array) {
    if (benchmark instanceof Uint8Array) {
      if (source.length !== benchmark.length) return false;
      return source.every((value, index) => value === benchmark[index]);
    }
    return false;
  }

  // 2. Date Comparison
  if (source instanceof Date || benchmark instanceof Date) {
    const sourceTime = source instanceof Date ? source.getTime() : new Date(source as string | number).getTime();
    const benchTime = benchmark instanceof Date ? benchmark.getTime() : new Date(benchmark as string | number).getTime();
    return sourceTime === benchTime;
  }

  // 3. High-Precision Numeric Comparison (Decimal.js)
  try {
    const arg1 = new Decimal(String(source));
    const arg2 = new Decimal(String(benchmark));

    return arg1.toFixed(digits) === arg2.toFixed(digits);
  } catch (e) {
    return false;
  }
};

/**
 * REFACTORED: High-precision 'Greater Than' comparison using Decimal.js.
 * Eliminates IEEE 754 floating-point rounding errors.
 * 
 * @function isHigher
 * @param {number | string} source - The new/current value.
 * @param {number | string} benchmark - The old/target value.
 * @param {number} [digits=8] - Precision to trim before comparison.
 * @returns {boolean} True if source > benchmark.
 */
export const isHigher = (source: number | string, benchmark: number | string, digits: number = 8): boolean => {
  try {
    const s = new Decimal(source).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
    const b = new Decimal(benchmark).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
    return s.greaterThan(b);
  } catch (e) {
    return false;
  }
};

/**
 * REFACTORED: High-precision 'Less Than' comparison using Decimal.js.
 * 
 * @function isLower
 * @param {number | string} source - The new/current value.
 * @param {number | string} benchmark - The old/target value.
 * @param {number} [digits=8] - Precision to trim before comparison.
 * @returns {boolean} True if source < benchmark.
 */
export const isLower = (source: number | string, benchmark: number | string, digits: number = 8): boolean => {
  try {
    const s = new Decimal(source).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
    const b = new Decimal(benchmark).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
    return s.lessThan(b);
  } catch (e) {
    return false;
  }
};

/**
 * REFACTORED: Normalizes a value to a fixed-point STRING to prevent number casting noise.
 * Use this for values intended for DB storage or API payloads.
 * 
 * @function format
 * @param {number | string} value - Raw input.
 * @param {number} [digits=14] - Target decimal places.
 * @returns {number} The formatted number (defaults to 0 on error).
 */
export const format = (value: number | string, digits: number = 14): number => {
  try {
    const decimalValue = typeof value === 'number' ? new Decimal(value.toFixed(digits)) : new Decimal(String(value));
    return decimalValue.toNumber();
  } catch (e) {
    return 0;
  }
};

/**
 * NEW: Numeric cast helper for cases where a native number is MANDATORY.
 * Use this only if a 3rd party library requires a number type, knowing the risk.
 */
export const toNumber = (value: number | string | Decimal, digits: number = 8): number => {
  return parseFloat(new Decimal(value as any).toFixed(digits));
};

/**
 * Capitalizes the first letter of every word in a string.
 * @function toProperCase
 */
export const toProperCase = (text: string): string => {
  return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Analyzes an array of objects to determine the maximum string length of each key.
 * Used for dynamic CLI table formatting and log alignment.
 * 
 * @async
 * @function getLengths
 * @template T
 * @param {Record<string, number>} keylens - Initial lengths and config (e.g., colBuffer).
 * @param {Array<Partial<T>>} record - The dataset to analyze.
 * @returns {Promise<Record<string, number>>} The updated length map.
 */
export const getLengths = async <T>(keylens: Record<string, number>, record: Array<Partial<T>>) => {
  if (record === undefined) return keylens;
  const { colBuffer } = keylens;

  return record.reduce((maxLengthObj, currentObj) => {
    Object.keys(currentObj).forEach((key) => {
      const currentValue = currentObj[key as keyof T];
      if (typeof currentValue === "string") {
        const currentLength = currentValue.length;
        const existingLength = maxLengthObj[key] || 0;
        if (currentLength > existingLength) {
          maxLengthObj[key] = currentLength + colBuffer;
        }
      }
    });
    return maxLengthObj;
  }, { ...keylens } as Record<string, number>);
};

/**
 * Validates if an object contains at least one defined value.
 * @function hasValues
 */
export const hasValues = <T extends object>(props: T): boolean => 
  Object.keys(props).length > 0 && !Object.values(props).every((v) => v === undefined);

/**
 * Standard non-blocking delay/sleep utility.
 * @function delay
 */
export const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

/**
 * Internal helper for CSV value escaping and type-safe stringification.
 * Handles Uint8Arrays by converting to hex strings.
 */
const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  if (val instanceof Uint8Array) return `"${Buffer.from(val).toString("hex")}"`;
  if (val instanceof Date) return `"${val.toISOString()}"`;
  if (typeof val === "number") return val.toString();
  if (typeof val === "boolean") return val ? "true" : "false";
  return `"${String(val).replace(/"/g, '""')}"`;
};

/**
 * Writes an array of strings or objects to a local file.
 * Automatically converts object arrays into CSV format with headers.
 * 
 * @function fileWrite
 * @template T
 * @param {string} filePath - Absolute or relative path.
 * @param {T[]} array - Data collection to persist.
 */
export const fileWrite = <T extends object | string>(filePath: string, array: T[]): void => {
  if (!Array.isArray(array) || array.length === 0) return;

  try {
    let text: string;
    if (typeof array[0] === "object") {
      const headers = Object.keys(array[0] as object).join(",");
      const rows = (array as object[]).map((obj) => 
        Object.keys(array[0] as object).map(key => formatValue((obj as any)[key])).join(",")
      );
      text = [headers, ...rows].join("\n");
    } else {
      text = array.join("\n");
    }

    fs.writeFileSync(filePath, text, "utf8");
    console.log(`-> [Success] fileWrite: ${array.length} records written to ${filePath}`);
  } catch (error) {
    console.error(`-> [Error] fileWrite to ${filePath}:`, error instanceof Error ? error.message : error);
  }
};