import { Select, Modify, UniqueKey } from "../query.utils";
import { RowDataPacket } from "mysql2";

const PeriodType: string[][] = [
  ['1m', '1 Minute'],
  ['3m', '3 Minutes'],
  ['5m', '5 Minutes'],
  ['15m', '15 Minutes'],
  ['30m', '30 Minutes'],
  ['1H', '1 Hour'],
  ['2H', '2 Hours'],
  ['4H', '4 Hours'],
  ['6H', '6 Hours'],
  ['8H', '8 Hours'],
  ['12H', '12 Hours'],
  ['1D', '1 Day'],
  ['3D', '3 Days'],
  ['1W', '1 Week'],
  ['1M', '1 Month'],
];

export interface IPeriodType extends RowDataPacket {
  period_type: number;
  period: string;
  description: string;
};

export async function Publish(Period: string, Description: string): Promise<number> {
  const key = UniqueKey("");
  const set = await Modify(
    `INSERT IGNORE INTO period_type VALUES (UNHEX(?), ?, ?)`,
    [key, Period, Description]
  );
  const get = await Select<IPeriodType>(
    "SELECT period_type FROM period_type WHERE period = ?",
    [Period]
  );

  /*@ts-ignore*/
  return get.length === 0 ? set.insertId : get[0].period_type;
};

export function Import() {
  PeriodType.forEach((item) => {
  const set = Publish(item[0],item[1]);
})};
