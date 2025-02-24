"use strict";

export const Novalue: number = -1;

export enum Direction {
  None = 0,
  Up = 1,
  Down = -1,
  Flat = 2,
  Unset = -2,
};

export enum Action {
  None,
  Buy,
  Sell,
  Wait,
};

export interface ICompare {
  value: number;
  digits: number;
  update: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Returns Blofin instrument symbols from pair; forces 'USDT' on empty second           |
//+--------------------------------------------------------------------------------------+
export const SplitSymbol = (symbol: string): string[] => {
  const symbols: string[] = symbol.split("-");

  if (symbols.length === 1) {
    symbols.push("USDT");
  }
  return symbols;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on high value comparison and updates value if .update is set to true    |
//+--------------------------------------------------------------------------------------+
export const IsHigher = (test: number, props: ICompare): boolean => {
  if (parseFloat(test.toFixed(props.digits)) > parseFloat(props.value.toFixed(props.digits))) {
    if (props.update) props.value = parseFloat(test.toFixed(props.digits));

    return true;
  }
  return false;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on low value comparison and updates value if .update is set to true     |
//+--------------------------------------------------------------------------------------+
export const IsLower = (test: number, props: ICompare): boolean => {
  if (parseFloat(test.toFixed(props.digits)) < parseFloat(props.value.toFixed(props.digits))) {
    if (props.update) props.value = parseFloat(test.toFixed(props.digits));

    return true;
  }
  return false;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on [value, digits] comparison and reforms value on .update           |
//+--------------------------------------------------------------------------------------+
export const IsEqual = (test: number, props: ICompare): boolean => {
  if (parseFloat(test.toFixed(props.digits)) === parseFloat(props.value.toFixed(props.digits))) {
    if (props.update) props.value = parseFloat(test.toFixed(props.digits));

    return true;
  }
  return false;
};
