//+--------------------------------------------------------------------------------------+
//|                                                                            keyset.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
import { copy, hex, splitSymbol } from "@/lib/std.util";
import * as Instrument from "@db/interfaces/instrument";
import * as Currency from "@db/interfaces/trade_state";
import * as Period from "@db/interfaces/period";
import * as TradeState from "@db/interfaces/trade_state";

export interface IKeyProps {
  instrument?: Uint8Array;
  currency?: Uint8Array | Array<Uint8Array>;
  symbol?: string | Array<string>;
  period?: Uint8Array;
  timeframe?: string;
  tradeState?: Uint8Array;
  activeCollection?: boolean;
  state?: string;
}

//+--------------------------------------------------------------------------------------+
//| Examine instrument period search methods in props; return keys in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function KeySet<T extends IKeyProps>(props: T, limit: number = 1): Promise<T> {
  const zero: Uint8Array = hex("0", 3);
  const blank: IKeyProps = {
    instrument: zero,
    currency: [zero, zero],
    symbol: ["", ""],
    period: zero,
    timeframe: "",
    tradeState: zero,
    activeCollection: false,
    state: "",
  };

  props.symbol = props.symbol && (splitSymbol(props.symbol));

  if (props.currency)

console.log(typeof props.symbol);
console.log(props.symbol)
//    props.currency = await(Currency.Key<typeof props.symbol>(props));

  const params: IKeyProps = copy(props, blank);
  const keys: Array<Uint8Array | string | number | boolean> = [];
  const filters: Array<string> = [];
  const keyset: Array<Uint8Array> = [];

  copy(props, params);
  console.log(props, params);
  //   let sql = `select instrument from vw_instrument_periods`;

  //   params.instrument = await Instrument.Key<IKeyProps>(props);
  //   params.period = await Period.Key<IKeyProps>(props);
  //   params.tradeState = await TradeState.Key<IKeyProps>(props);

  //   if (params.instrument) {
  //     filters.push(`instrument`);
  //     keys.push(params.instrument);
  //   }

  //   if (params.period) {
  //     filters.push(`period`);
  //     keys.push(params.period);
  //   }
  //   if (params.tradeState) {
  //     filters.push(`trade_state`);
  //     keys.push(params.tradeState);
  //   }

  //   if (props.activeCollection) {
  //     filters.push(`active_collection`);
  //     keys.push(props.activeCollection);
  //   }

  //   filters.forEach((filter, position) => {
  //     sql += (position ? ` AND ` : ` WHERE `) + filter + ` = ?`;
  //   });

  //   const instruments = await Select<IInstrumentPeriod>(sql, keys);

  //   instruments.forEach((key) => keyset.push(key.instrument!));
  //   console.log(sql, keys, filters, params);
  //   return keyset === undefined ? undefined : keyset.slice(0, limit);
  return new Promise(() => params);
}
