import { Select, Modify } from "../query.utils";
import type { RowDataPacket } from "mysql2";

export interface IInstrument extends RowDataPacket {
  instrument: number;
  base_currency: number;
  quote_currency: number;
  suspended: boolean;
}

export function all() {
  return Select<IInstrument>("SELECT * FROM instrument;");
}

export function byInstrument(Instrument: number) {
  return Select<IInstrument>(`SELECT * FROM instrument WHERE instrument = ${Instrument};`);
}

export function bySymbol(Symbol: string) {
  const source: string[] = Symbol.split('-');
  if (source.length === 1) source.push('USDT');
  return Select<IInstrument>(`SELECT * FROM instrument i, currency b, currency q WHERE i.base_currency = b.currency and i.quote_currency = q.currency and b.symbol = '${source[0]}' and q.symbol = '${source[1]}';`);
}

export function add(Instrument: string) {
  const currency: string[] = Instrument.split('-');
  return Modify(`CALL insertInstrument('${currency[0]}', '${currency[1]}');`);
}  
  