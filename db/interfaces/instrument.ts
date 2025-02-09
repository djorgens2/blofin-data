import { Select, Modify, UniqueKey } from "../query.utils";
import { RowDataPacket } from "mysql2";

export interface IInstrument extends RowDataPacket {
    instrument: number;
    base_currency: number;
    quote_currency: number;
};

export async function Publish(Base: number, Quote: number): Promise<number> {
  const key = UniqueKey('');
  const set = await Modify(`INSERT IGNORE INTO instrument VALUES (UNHEX(?),?,?)`,[key, Base, Quote]);
  const get = await Select<IInstrument>('SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?', [Base, Quote]);

  /*@ts-ignore*/
  return (get.length === 0 ? set.insertId : get[0].instrument);
};
