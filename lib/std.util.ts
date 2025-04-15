//+--------------------------------------------------------------------------------------+
//|                                                                          std.util.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

//-- IPC message header
export interface IMessage {
  state: string; //-- may convert to enum
  symbol: string;
  node: number;
  code?: number;
  success?: boolean;
  text?: string;
  timestamp?: EpochTimeStamp;
  db?: {
    insert?: number;
    update?: number;
  };
  events?: {
    fractal?: number;
    sma?: number;
  };
  account?: {
    open?: number;
    close?: number;
  };
}

//+--------------------------------------------------------------------------------------+
//| Returns initialized Message header (clone) with identity retention (symbol);         |
//+--------------------------------------------------------------------------------------+
export function clear(message: IMessage): IMessage {
  return {
    state: message.state,
    symbol: message.symbol,
    node: message.node,
    code: 0,
    success: true,
    text: "",
    timestamp: Date.now(),
    db: {
      insert: 0,
      update: 0,
    },
    events: {
      fractal: 0,
      sma: 0,
    },
    account: {
      open: 0,
      close: 0,
    },
  };
}

//+--------------------------------------------------------------------------------------+
//| Returns Blofin instrument symbols from pair; forces 'USDT' on empty second           |
//+--------------------------------------------------------------------------------------+
export const splitSymbol = (symbol: string | Array<string>): Array<string> => {
  const symbols: Array<string> = typeof symbol === "string" ? symbol.split("-") : typeof Array.isArray(symbol) ? symbol[0].split("-") : [];

  symbols.length === 1 && symbols.push("USDT");
  symbols[1].length === 0 && symbols.splice(1, 1, "USDT");

  return symbols.slice(0, 2);
};

//+--------------------------------------------------------------------------------------+
//| Returns a UIntArray on a valid hex value passed as a string|number; validates binary |
//+--------------------------------------------------------------------------------------+
export const hex = (key: string | number | object, length: number = 0): Uint8Array => {
  const regex = /^\d+$/;
  const bytes = [];

  function dec(obj: object): number {
    let hex: string = "";
    "type" in obj && obj.type === "Buffer" && "data" in obj && Array.isArray(obj.data)
      ? obj.data.forEach((val) => (hex += val.toString(16)))
      : Object.values(obj).map((val) => (hex += val.toString(16)));
    return parseInt(hex, 16);
  }

  if (key instanceof Uint8Array) if (key.length === length || length === 0) return key;
  if (typeof key === "string" && key.indexOf("Buffer") === 1) {
    key = "0x" + key.slice(8, 15).split(" ").join("");
  }

  let decimal: number =
    typeof key === "number"
      ? key
      : typeof key === "string"
      ? key.slice(0, 2) === "0x"
        ? parseInt(key, 16)
        : regex.test(key)
        ? parseInt(key, 16)
        : 0
      : typeof key === "object"
      ? dec(key)
      : 0;

  while (decimal > 0) {
    bytes.unshift(decimal % 256);
    decimal = Math.floor(decimal / 256);
  }

  while (bytes.length < length) bytes.unshift(0);
  return Buffer.from(new Uint8Array(bytes.length <= Math.abs(length) || length === 0 ? bytes : []));
};

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
  return `<buffer ${hex}>`;
}

//+--------------------------------------------------------------------------------------+
//| Parses supplied string into a JSON|props object of <T> typically xfer'd via cli      |
//+--------------------------------------------------------------------------------------+
export function parse<T extends object>(arg: string): Required<T> | undefined {
  try {
    const json = JSON.parse(arg);

    if (typeof json === "object" && json !== null) {
      const obj: Required<T> = { ...json };
      return obj;
    }
  } catch (e) {
    throw new Error(`something jacked up`);
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
  const arg1: string = typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits);
  const arg2: string = typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits);

  return arg1 > arg2;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on lower number|precision of the soruce(new) to benchmark(old)          |
//+--------------------------------------------------------------------------------------+
export const isLower = (source: number | string, benchmark: number | string, digits: number = 8): boolean => {
  const arg1: string = typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits);
  const arg2: string = typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits);

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
  try {
    const text = array.join("\n");
    fs.writeFileSync(filePath, text);
    console.log(`Array successfully written to ${filePath}`);
  } catch (error: any) {
    console.error(`Error writing to ${filePath}:`, error.message);
  }
}
