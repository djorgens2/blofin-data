import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface IInstrument extends RowDataPacket {
  instrument: number;
  base_currency: number;
  quote_currency: number;
}

export interface IInstrumentPair extends RowDataPacket {
  instrument: number;
  instrument_pair: string;
  period: number;
  timeframe: string;
  base_currency: number;
  base_symbol: string;
  quote_currency: number;
  quote_symbol: string;
  data_collection_rate: number;
  sna_factor: number;
  is_trading: boolean;
}

export async function Publish(Base: number, Quote: number): Promise<number> {
  const key = UniqueKey("");
  const set = await Modify(
    `INSERT IGNORE INTO instrument VALUES (UNHEX(?),?,?,false)`,
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
    `SELECT i.instrument, concat(b.symbol,'-',q.symbol) AS instrument_pair, pt.period, pt.timeframe, b.currency AS base_currency, b.symbol AS base_symbol,
            q.currency AS quote_currency, q.symbol AS quote_symbol, ip.data_collection_rate, ip.sma_factor, i.is_trading
       FROM instrument i, instrument_period ip, period pt, currency b, currency q
      WHERE i.base_currency=b.currency AND i.quote_currency=q.currency AND i.instrument = ip.instrument AND ip.period = pt.period AND ip.data_collection_rate>0 AND b.suspense = false`,
    []
  );
}
