"use strict";

export interface ICompare {
  value: number;
  digits: number;
  update: boolean;
}

//export const dir:Action = Action.Sell;

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
//| Returns true on high value comparison and updates value if .update is set to true    |
//+--------------------------------------------------------------------------------------+
export const isBetween = (test: number, bound1: number, bound2: number, digits:number = 8): boolean => {
  const highBound = Math.max(bound1,bound2).toFixed(digits);
  const lowBound = Math.min(bound1,bound2).toFixed(digits);

  if (test.toFixed(digits) > lowBound)
    if (test.toFixed(digits) < highBound)
      return true;

  return false;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on high value comparison and updates value if .update is set to true    |
//+--------------------------------------------------------------------------------------+
export const isHigher = (test: number, props: ICompare): boolean => {
  if (parseFloat(test.toFixed(props.digits)) > parseFloat(props.value.toFixed(props.digits))) {
    if (props.update) props = {value: parseFloat(test.toFixed(props.digits)), digits: props.digits, update: props.update};

    return true;
  }
  return false;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on low value comparison and updates value if .update is set to true     |
//+--------------------------------------------------------------------------------------+
export const isLower = (test: number, props: ICompare): boolean => {
  if (parseFloat(test.toFixed(props.digits)) < parseFloat(props.value.toFixed(props.digits))) {
    if (props.update) props.value = parseFloat(test.toFixed(props.digits));

    return true;
  }
  return false;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on [value, digits] comparison and reforms value on .update           |
//+--------------------------------------------------------------------------------------+
export const isEqual = (test: number, props: ICompare): boolean => {
  if (parseFloat(test.toFixed(props.digits)) === parseFloat(props.value.toFixed(props.digits))) {
    if (props.update) props.value = parseFloat(test.toFixed(props.digits));

    return true;
  }
  return false;
};
