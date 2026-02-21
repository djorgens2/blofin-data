//+--------------------------------------------------------------------------------------+
//|                                                                          std.util.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { hexify } from "#lib/crypto.util";

import Prompt from "#cli/modules/Prompts";
import Decimal from "decimal.js";

//+--------------------------------------------------------------------------------------+
//| Currency formatter; returns values formatted in USD;                                 |
//+--------------------------------------------------------------------------------------+
export const formatterUSD = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

//+--------------------------------------------------------------------------------------+
//| Pauses console app execution;                                                        |
//+--------------------------------------------------------------------------------------+
export const Pause = async (message: string) => {
  const { choice } = await Prompt(["choice"], { message, active: "continue", inactive: "exit", initial: true });
  if (!choice) process.exit(0);
};

//+--------------------------------------------------------------------------------------+
//| Returns a hex string for binary arrays; eg: 0xc0ffee returns '0xc0ffee'              |
//+--------------------------------------------------------------------------------------+
export const hexString = (uint8Array: Uint8Array, length: number, prefix = "0x"): string => {
  if (uint8Array instanceof Uint8Array) {
    const hex = Array.from(uint8Array)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return prefix + hex.padStart(length, "0");
  }
  return `${prefix}`;
};

//+--------------------------------------------------------------------------------------+
//| Returns a buffer string for binary arrays; eg: 0xc0ffee returns '<Buffer c0 ff ee>'  |
//+--------------------------------------------------------------------------------------+
export const bufferString = (uint8Array: Uint8Array): string => {
  const hex = Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return `<Buffer ${hex}>`;
};

/**
 * std.util.ts: Runtime data-type normalization
 */

// Define the keys that should always be hexified across the system
const HEX_FIELD_PATTERN = /(_id|account|request|instrument|state|category|source|position)$/i;

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

//+--------------------------------------------------------------------------------------+
//| Parses supplied string into a JSON|props object of <T> typically xfer'd via cli      |
//+--------------------------------------------------------------------------------------+
export const parseJSON = <T extends object>(arg: string): Required<T> | undefined => {
  try {
    const json = JSON.parse(arg);

    if (typeof json === "object" && json !== null) {
      const obj: Required<T> = { ...json };
      return obj;
    }
  } catch (e) {
    //--- whitelist exceptions
    if (arg === "pong")
      // @ts-ignore
      return { event: "pong" };

    if (arg === `{""}`)
      // @ts-ignore
      return {};
    throw new Error(`Something jacked up; ${arg} is not a valid JSON;`);
  }
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns date modified by timeframe from supplied date;                               |
//+--------------------------------------------------------------------------------------+
export const setExpiry = (period: string, from?: Date) => {
  const expiry = from || new Date();
  const timeframe = period.slice(-1);
  const units = parseInt(period) * (timeframe === "s" ? 1000 : timeframe === "m" ? 60000 : timeframe === "h" ? 3600000 : timeframe === "d" ? 86400000 : 0);
  return new Date(expiry.getTime() + units);
};

export const timeString = () => {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
  return time;
};

//+--------------------------------------------------------------------------------------+
//| Returns true if value is in bounds conclusively; inside the bounds exclusively       |
//+--------------------------------------------------------------------------------------+
export const isBetween = (source: number, bound1: number, bound2: number, inclusive = true, digits: number = 8): boolean => {
  const highBound: number = parseFloat(Math.max(bound1, bound2).toFixed(digits));
  const lowBound: number = parseFloat(Math.min(bound1, bound2).toFixed(digits));
  const check: number = parseFloat(source.toFixed(digits));

  if (!inclusive) return check > lowBound && check < highBound;

  return lowBound === check || highBound === check;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on equal comparison of values at specified precision                    |
//+--------------------------------------------------------------------------------------+
type ComparableValue = number | string | Uint8Array | Date | Decimal;
export const isEqual = (source: ComparableValue, benchmark: ComparableValue, digits: number = 8, log: boolean = false): boolean => {
  if (source == null && benchmark == null) {
    return true;
  }

  if (source == null || benchmark == null) {
    return false;
  }

  // --- 1. Handle Uint8Array (Buffer/Binary data) ---
  if (source instanceof Uint8Array) {
    if (benchmark instanceof Uint8Array) {
      if (source.length !== benchmark.length) return false;
      return source.every((value, index) => value === benchmark[index]);
    }
    return false;
  }

  // --- 2. Handle Date Objects (Compare timestamps numerically) ---
  if (source instanceof Date || benchmark instanceof Date) {
    const sourceTime = source instanceof Date ? source.getTime() : new Date(source as string | number).getTime();
    const benchTime = benchmark instanceof Date ? benchmark.getTime() : new Date(benchmark as string | number).getTime();
    return sourceTime === benchTime;
  }

  // --- 3. Handle Numeric/String values using Decimal.js ---
  try {
    const arg1 = new Decimal(source as string | number | Decimal);
    const arg2 = new Decimal(benchmark as string | number | Decimal);

    log && console.log({ arg1, arg2 });

    return arg1.toFixed(digits) === arg2.toFixed(digits);
  } catch (e) {
    console.error("isEqual: Invalid input for Decimal conversion", { source, benchmark });
    return false; // Return false if conversion fails (e.g., empty string)
  }
};

//+--------------------------------------------------------------------------------------+
//| Returns true on higher number|precision of the soruce(new) to benchmark(old)         |
//+--------------------------------------------------------------------------------------+
export const isHigher = (source: number | string, benchmark: number | string, digits: number = 8): boolean => {
  const arg1: number = Number(typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits));
  const arg2: number = Number(typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits));

  return arg1 > arg2;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on lower number|precision of the soruce(new) to benchmark(old)          |
//+--------------------------------------------------------------------------------------+
export const isLower = (source: number | string, benchmark: number | string, digits: number = 8): boolean => {
  const arg1: number = Number(typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits));
  const arg2: number = Number(typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits));

  return arg1 < arg2;
};

//+--------------------------------------------------------------------------------------+
//| Returns a numeric value formatted to a specified precision                           |
//+--------------------------------------------------------------------------------------+
export const format = (value: number | string, digits: number = 14): number => {
  const formatted: string = typeof value === "string" ? parseFloat(value).toFixed(digits) : typeof value === "number" ? value.toFixed(digits) : value;

  return isNaN(parseFloat(formatted)) ? 0 : Number(formatted);
};

export const toProperCase = (text: string) => {
  text = text.toLowerCase();
  
  // Use replace with a regular expression to find the first letter of each word
  // \b matches a word boundary, \w matches a word character
  return text.replace(/\b\w/g, function(char) {
    // Capitalize the matched first character
    return char.toUpperCase();
  });
}

//+--------------------------------------------------------------------------------------+
//| Returns the max length of each object key from array; default maximums in keylens;   |
//+--------------------------------------------------------------------------------------+
export const getLengths = async <T>(keylens: Record<string, number>, record: Array<Partial<T>>) => {
  if (record === undefined) return keylens;
  const { colBuffer } = keylens;

  return record.reduce(
    (maxLengthObj: Record<string, number>, currentObj) => {
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
    },
    { ...keylens } as Record<string, number>,
  );
};

//+--------------------------------------------------------------------------------------+
//| True if supplied object has at minimum one key containing a value not undefined;     |
//+--------------------------------------------------------------------------------------+
export const hasValues = <T extends object>(props: T) => Object.keys(props).length && !Object.values(props).every((value) => value === undefined);

/**
 * Delay timer used predominantly for api throttle control;
 *
 */
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Formats a value for CSV output, handling strings, numbers, booleans, and dates appropriately.
 *
 */
const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '""';

  if (val instanceof Uint8Array) return `"${Buffer.from(val).toString("hex")}"`;

  // Handle Dates (Standard for Trading History)
  if (val instanceof Date) return `"${val.toISOString()}"`;

  // Handle Numbers (Avoid quotes if you want them as numeric in Excel/CSV)
  if (typeof val === "number") return val.toString();

  // Handle Booleans
  if (typeof val === "boolean") return val ? "true" : "false";

  // Default: Escape quotes and wrap in quotes
  const cleaned = String(val).replace(/"/g, '""');
  return `"${cleaned}"`;
};

//+--------------------------------------------------------------------------------------+
//| Writes arrays of any type to the supplied file                                       |
//+--------------------------------------------------------------------------------------+
import * as fs from "node:fs";

/**
 * Optimized 2026 CSV/Text Writer
 * @param filePath Destination path
 * @param array Data to write (Array of Objects or Strings)
 */
export const fileWrite = <T extends object | string>(filePath: string, array: T[]): void => {
  // Guard 1: Use Array.isArray directly (typeof Array.isArray is a common 2024 typo)
  if (!Array.isArray(array) || array.length === 0) return;

  try {
    let text: string;

    // Type Guard: Check first element to determine if we need CSV conversion
    if (typeof array[0] === "object") {
      const headers = Object.keys(array[0] as object).join(",");
      const rows = (array as object[]).map((obj) => Object.values(obj).map(formatValue).join(","));
      text = [headers, ...rows].join("\n");
    } else {
      // It's a simple array of strings/primitives
      text = array.join("\n");
    }

    fs.writeFileSync(filePath, text, "utf8");
    console.log(`-> [Success] fileWrite: ${array.length} records written to ${filePath}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown file error";
    console.error(`-> [Error] fileWrite to ${filePath}:`, msg);
  }
};
