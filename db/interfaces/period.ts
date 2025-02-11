import { Select, Modify, UniqueKey } from "../query.utils";
import { RowDataPacket } from "mysql2";

const Period: string[][] = [
  ["1m", "1 Minute"],
  ["3m", "3 Minutes"],
  ["5m", "5 Minutes"],
  ["15m", "15 Minutes"],
  ["30m", "30 Minutes"],
  ["1H", "1 Hour"],
  ["2H", "2 Hours"],
  ["4H", "4 Hours"],
  ["6H", "6 Hours"],
  ["8H", "8 Hours"],
  ["12H", "12 Hours"],
  ["1D", "1 Day"],
  ["3D", "3 Days"],
  ["1W", "1 Week"],
  ["1M", "1 Month"],
];

export interface IPeriod extends RowDataPacket {
  period: number;
  Timeframe: string;
  description: string;
}

export async function Publish(
  Timeframe: string,
  Description: string
): Promise<number> {
  const key = UniqueKey("");
  const set = await Modify(
    `INSERT IGNORE INTO period VALUES (UNHEX(?), ?, ?)`,
    [key, Timeframe, Description]
  );
  const get = await Select<IPeriod>(
    "SELECT period FROM period WHERE timeframe = ?",
    [Timeframe]
  );

  /*@ts-ignore*/
  return get.length === 0 ? set.insertId : get[0].period;
}

export function Import() {
  Period.forEach((item) => {
    Publish(item[0], item[1]);
  });
}
