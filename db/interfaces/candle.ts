import { Select, Modify } from "../query.utils";
import type { RowDataPacket } from "mysql2";

export interface ICandle extends RowDataPacket {
    instrument: number;
    period_type: number;
    bar_time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    currency: number,
    currency_quote : number,
    completed: boolean
}

export function all() {
  return Select<ICandle>(`SELECT * FROM candle;`);
}

export function byInstrument(Instrument: string, Period: string) {
  return Select<ICandle>(`SELECT * FROM candle WHERE instrument = '${Instrument}' AND period_type='${Period}';`);
}

export function merge(Instrument: string, Period: string, candle: string[]) {
  return Modify(`INSERT INTO candle values (${candle[0]}, ${candle[0]});`)
}
