import { Select, Modify, UniqueKey } from "../query.utils";
import { RowDataPacket } from "mysql2";

export interface IInstrument extends RowDataPacket {
  instrument: number;
  base_currency: number;
  quote_currency: number;
}

export interface IInstrumentPair extends RowDataPacket {
  instrument: number;
  pair: string;
  period_type: number;
  period: string;
  base_currency: number;
  base_symbol: string;
  quote_currency: number;
  quote_symbol: string;
}

export async function Publish(Base: number, Quote: number): Promise<number> {
  const key = UniqueKey("");
  const set = await Modify(
    `INSERT IGNORE INTO instrument VALUES (UNHEX(?),?,?)`,
    [key, Base, Quote]
  );
  const get = await Select<IInstrument>(
    "SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?",
    [Base, Quote]
  );

  /*@ts-ignore*/
  return get.length === 0 ? set.insertId : get[0].instrument;
}

export function Fetch() {
  return Select<IInstrumentPair>(
    `SELECT i.instrument, concat(b.symbol,'-',q.symbol) AS pair, pt.period_type, pt.period, b.currency AS base_currency, b.symbol AS base_symbol, q.currency AS quote_currency, q.symbol AS quote_symbol
       FROM instrument i, instrument_period ip, period_type pt, currency b, currency q
      WHERE i.base_currency=b.currency AND i.quote_currency=q.currency AND i.instrument = ip.instrument AND ip.period_type = pt.period_type
        AND ip.trading_period = true AND b.suspense = false`,
    []
  );
}
