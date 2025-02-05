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

export function byCurrency(Instrument: string) {
  const currency: string[] = Instrument.split('-');
  return Select<IInstrument>(`SELECT * FROM instrument i, currency_type b, currency_type q WHERE i.base_currency = b.currency_type and i.quote_currency = q.currency_type and b.short_name = '${currency[0]}' and q.short_name = '${currency[1]}';`);
}

export function setSuspense(Instrument: number, Suspend: boolean) {
  return Modify(`UPDATE instrument SET suspended=${Suspend} WHERE instrument = ${Instrument};`);
}  

export function add(Instrument: string) {
  const currency: string[] = Instrument.split('-');
  return Modify(`CALL insertInstrument('${currency[0]}', '${currency[1]}');`);
}  
  