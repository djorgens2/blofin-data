import { Select, Modify } from "../query.utils";
import type { RowDataPacket } from "mysql2";

export interface IInstrument extends RowDataPacket {
  instrument: number;
  base_currency: number;
  quote_currency: number;
  suspended: boolean;
}

function SplitSymbol(Symbol: string) {
  const symbol: string[] = Symbol.split('-');
  if (symbol.length === 1) symbol.push('USDT');
  return symbol;
}

export function all() {
  return Select<IInstrument>("SELECT * FROM instrument;");
}

export function byInstrument(Instrument: number) {
  return Select<IInstrument>(`SELECT * FROM instrument WHERE instrument = ${Instrument};`);
}

export function byCurrency(Base: number, Quote: number) {
  return Select<IInstrument>(`SELECT * FROM instrument WHERE base_currency = ${Base} and quote_currency = ${Quote};`);
}

export function bySymbol(Symbol: string) {
  const symbol: string[] = SplitSymbol(Symbol);
  return Select<IInstrument>(`SELECT * FROM instrument i, currency b, currency q WHERE i.base_currency = b.currency and i.quote_currency = q.currency and b.symbol = '${symbol[0]}' and q.symbol = '${symbol[1]}';`);
}

export function add(Symbol: string) {
  const symbol: string[] = SplitSymbol(Symbol);
  return Modify(`INSERT INTO instrument (base_currency, quote_currency) values('${symbol[0]}', '${symbol[1]}');`);
}  
  