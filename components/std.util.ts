const NoValue: number = -1;

export interface ICompare {
  Value: number;
  Precision: number;
  Update: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Returns Blofin instrument symbols from pair; forces 'USDT' on empty second           |
//+--------------------------------------------------------------------------------------+
export const SplitSymbol = (Symbol: string): string[] => {
  const symbols: string[] = Symbol.split("-");

  if (symbols.length === 1) {
    symbols.push("USDT");
  }
  return symbols;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on high value comparison and updates value if .Update is set to true    |
//+--------------------------------------------------------------------------------------+
export const IsHigher = (Test: number, Props: ICompare): boolean => {
  if (
    parseFloat(Test.toFixed(Props.Precision)) >
    parseFloat(Props.Value.toFixed(Props.Precision))
  ) {
    if (Props.Update) Props.Value = parseFloat(Test.toFixed(Props.Precision));

    return true;
  }
  return false;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on low value comparison and updates value if .Update is set to true     |
//+--------------------------------------------------------------------------------------+
export const IsLower = (Test: number, Props: ICompare): boolean => {
  if (
    parseFloat(Test.toFixed(Props.Precision)) <
    parseFloat(Props.Value.toFixed(Props.Precision))
  ) {
    if (Props.Update) Props.Value = parseFloat(Test.toFixed(Props.Precision));

    return true;
  }
  return false;
};

//+--------------------------------------------------------------------------------------+
//| Returns true on [value, precision] comparison and reforms value on .Update           |
//+--------------------------------------------------------------------------------------+
export const IsEqual = (Test: number, Props: ICompare): boolean => {
  if (
    parseFloat(Test.toFixed(Props.Precision)) ===
    parseFloat(Props.Value.toFixed(Props.Precision))
  ) {
    if (Props.Update) Props.Value = parseFloat(Test.toFixed(Props.Precision));

    return true;
  }
  return false;
};
