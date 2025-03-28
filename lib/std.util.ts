//+--------------------------------------------------------------------------------------+
//|                                                                          std.util.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

export interface IMeasure {
  min: number;
  max: number;
  now: number;
}

export const Direction = {
  None: 0,
  Up: 1,
  Down: -1,
  Flat: 2,
  Pend: -2,
} as const;

export const Action = {
  None: "No Action",
  Buy: "Buy",
  Sell: "Sell",
  Wait: "Wait",
} as const;

export const Bias = {
  None: 0,
  Short: -1,
  Long: 1,
} as const;

export const Role = {
  Unassigned: "Unassigned",
  Seller: "Seller",
  Buyer: "Buyer",
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];
export type Action = (typeof Action)[keyof typeof Action];
export type Bias = (typeof Bias)[keyof typeof Bias];
export type Role = (typeof Role)[keyof typeof Role];

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
//| Returns the direction key derived from supplied value                                |
//+--------------------------------------------------------------------------------------+
export const bias = (direction: Direction): Bias => {
  return direction === Direction.Up ? Bias.Long : direction === Direction.Down ? Bias.Short : Bias.None;
};

//+--------------------------------------------------------------------------------------+
//| Returns the direction key derived from supplied value                                |
//+--------------------------------------------------------------------------------------+
export const direction = (value: number): Direction => {
  return value > 0 ? Direction.Up : value < 0 ? Direction.Down : Direction.None;
};

//+--------------------------------------------------------------------------------------+
//| Returns true if value is in bounds conclusively; inside the bounds exclusively       |
//+--------------------------------------------------------------------------------------+
export const isBetween = (test: number, bound1: number, bound2: number, inclusive = true, digits: number = 8): boolean => {
  const highBound: number = parseFloat(Math.max(bound1, bound2).toFixed(digits));
  const lowBound: number = parseFloat(Math.min(bound1, bound2).toFixed(digits));
  const check: number = parseFloat(test.toFixed(digits));

  if (!inclusive) return check > lowBound && check < highBound;

  return lowBound === check || highBound === check;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on equal comparison at a specified precision                            |
//+--------------------------------------------------------------------------------------+
export const isEqual = (test: number | string, check: number | string, digits: number = 8): boolean => {
  const arg1: string = typeof test === "string" ? parseFloat(test).toFixed(digits) : test.toFixed(digits);
  const arg2: string = typeof check === "string" ? parseFloat(check).toFixed(digits) : check.toFixed(digits);

  return arg1 === arg2;
};

//+--------------------------------------------------------------------------------------+
//| Copies matching properties and values from source to target;                         |
//+--------------------------------------------------------------------------------------+
export function copy(source: any, target: any) {
  for (const key in source) {
    if (target.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  return target;
}

//+--------------------------------------------------------------------------------------+
//| Returns a buffer string for binary arrays; eg: 0xc0ffee returns 'Buffer< c0 ff ee >  |
//+--------------------------------------------------------------------------------------+
export function bufferString(uint8Array: Uint8Array): string {
  const hex = Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return `<buffer ${hex}>`;
}

//+--------------------------------------------------------------------------------------+
//| Constant type to convert text arrays into 'enum-like' type guards;                   |
//+--------------------------------------------------------------------------------------+
export const createEnumLike = <T extends string>(items: readonly T[]) => {
  const obj = {} as { [K in T]: K };
  items.forEach((item) => {
    obj[item] = item;
  });
  return obj as Readonly<typeof obj>;
};
