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

//-- IPC message header
export interface IMessage {
  state: `init` | `api` | `update` | `ready`;
  symbol: string;
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
export const clear = (message: IMessage): IMessage => {
  return {
    state: message.state,
    symbol: message.symbol,
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
export const splitSymbol = (symbol: string | Array<string>) => {
  const symbols: Array<string> = typeof symbol === "string" ? symbol.split("-") : typeof Array.isArray(symbol) ? symbol[0].split("-") : [];

  const base_symbol = symbols.length ? symbols[0] : ``;
  const quote_symbol = symbols.length === 1 ? "USDT" : symbols.length > 1 ? symbols[1] : ``;

  return [base_symbol, quote_symbol];
};

//+--------------------------------------------------------------------------------------+
//| Returns true if all conditions are met to signal a change in direction               |
//+--------------------------------------------------------------------------------------+
export const directionChanged = (oldDirection: Direction, newDirection: Direction): boolean => {
  if (newDirection === Direction.None) return false;
  if (oldDirection === newDirection) return false;
  return true;
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
