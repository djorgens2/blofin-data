//+--------------------------------------------------------------------------------------+
//|                                                                          std.util.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import Prompt from '@cli/modules/Prompts';

//+--------------------------------------------------------------------------------------+
//| Pauses console app execution;                                                        |
//+--------------------------------------------------------------------------------------+
export async function Pause( message: string) {
  const { choice } = await Prompt(["choice"], { message, active: "continue", inactive: "exit", initial: true });
  if (!choice) process.exit(0);
}

//+--------------------------------------------------------------------------------------+
//| Returns a hex string for binary arrays; eg: 0xc0ffee returns '0xc0ffee'              |
//+--------------------------------------------------------------------------------------+
export function hexString(uint8Array: Uint8Array, length: number): string {
  const hex = Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex.padStart(length, "0");
}

//+--------------------------------------------------------------------------------------+
//| Returns a buffer string for binary arrays; eg: 0xc0ffee returns '<Buffer c0 ff ee>'  |
//+--------------------------------------------------------------------------------------+
export function bufferString(uint8Array: Uint8Array): string {
  const hex = Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return `<Buffer ${hex}>`;
}

//+--------------------------------------------------------------------------------------+
//| Parses supplied string into a JSON|props object of <T> typically xfer'd via cli      |
//+--------------------------------------------------------------------------------------+
export function parseJSON<T extends object>(arg: string): Required<T> | undefined {
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
    throw new Error(`Something jacked up; ${arg} is not a valid JSON;`);
  }
  return undefined;
}

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
//| Returns true on equal comparison at a specified precision                            |
//+--------------------------------------------------------------------------------------+
export const isEqual = (source: number | string, benchmark: number | string, digits: number = 8): boolean => {
  const arg1: string = typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits);
  const arg2: string = typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits);

  return arg1 === arg2;
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
export const format = (value: number | string, digits: number = 8): number => {
  const formatted: string = typeof value === "string" ? parseFloat(value).toFixed(digits) : value.toFixed(digits);

  return Number(formatted);
};

//+--------------------------------------------------------------------------------------+
//| Writes arrays of any type to the supplied file                                       |
//+--------------------------------------------------------------------------------------+
import * as fs from "node:fs";

export function fileWrite(filePath: string, array: any[]): void {
  if (typeof Array.isArray(array) && array.length > 0) {
    try {
      const text = array.join("\n");
      fs.writeFileSync(filePath, text);
      console.log(`Array successfully written to ${filePath}`);
    } catch (error: any) {
      console.error(`Error writing to ${filePath}:`, error.message);
    }
  }
}
