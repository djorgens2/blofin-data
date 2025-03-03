"use strict";

export interface IMeasure {
  min: number,
  max: number,
  now: number,
};

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
export const splitSymbol = (symbol: string): string[] => {
  const symbols: string[] = symbol.split("-");

  if (symbols.length === 1) {
    symbols.push("USDT");
  }
  return symbols;
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
//| Returns true on high value comparison and updates value if .update is set to true    |
//+--------------------------------------------------------------------------------------+
export const isBetween = (test: number, bound1: number, bound2: number, inclusive = true, digits: number = 8): boolean => {
  const highBound:number = parseFloat(Math.max(bound1, bound2).toFixed(digits));
  const lowBound:number = parseFloat(Math.min(bound1, bound2).toFixed(digits));
  const check:number = parseFloat(test.toFixed(digits));

  if (!inclusive) return (check > lowBound && check < highBound);

  return lowBound === check || highBound === check;
};
