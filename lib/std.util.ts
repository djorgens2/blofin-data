//+--------------------------------------------------------------------------------------+
//|                                                                          std.util.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import Prompt from "cli/modules/Prompts";
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

  if (source == null  || benchmark == null) {
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
    { ...keylens } as Record<string, number>
  );
};

//+--------------------------------------------------------------------------------------+
//| True if supplied object has at minimum one key containing a value not undefined;     |
//+--------------------------------------------------------------------------------------+
export const hasValues = <T extends object>(props: T) => Object.keys(props).length && !Object.values(props).every((value) => value === undefined);

//+--------------------------------------------------------------------------------------+
//| Writes arrays of any type to the supplied file                                       |
//+--------------------------------------------------------------------------------------+
import * as fs from "node:fs";

export const fileWrite = (filePath: string, array: any[]): void => {
  if (typeof Array.isArray(array) && array.length > 0) {
    try {
      const text = array.join("\n");
      fs.writeFileSync(filePath, text);
      console.log(`Array successfully written to ${filePath}`);
    } catch (error: any) {
      console.error(`Error writing to ${filePath}:`, error.message);
    }
  }
};
