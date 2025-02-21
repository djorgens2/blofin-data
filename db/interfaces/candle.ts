import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface ICandle extends RowDataPacket {
  instrument: number;
  period: number;
  bar_time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vol_currency: number;
  vol_currency_quote: number;
  completed: boolean;
}

export async function Publish(
  Instrument: number,
  Period: number,
  BarTime: number,
  Open: number,
  High: number,
  Low: number,
  Close: number,
  Volume: number,
  VolCurrency: number,
  VolCurrencyQuote: number,
  Completed: boolean
): Promise<number> {
  const set = await Modify(
    `REPLACE INTO candle SET instrument = ?, period = ?, bar_time = FROM_UNIXTIME(?/1000), open = ?, high = ?, low = ?, close = ?,
        volume = ?, vol_currency = ?, vol_currency_quote = ?, completed = ?`,
    [
      Instrument,
      Period,
      BarTime,
      Open,
      High,
      Low,
      Close,
      Volume,
      VolCurrency,
      VolCurrencyQuote,
      Completed,
    ]
  );

  return set.insertId;
}

export function Fetch(instrument: number, period: number) {
  return Select<ICandle>(
    `SELECT bar_time, open, high, low, close FROM candle
     WHERE instrument = ?	AND period = ? ORDER BY	bar_time;
`,
    [instrument, period]
  );
}
