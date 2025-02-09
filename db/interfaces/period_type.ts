import { Select, Modify, UniqueKey } from "../query.utils";
import { RowDataPacket } from "mysql2";

export interface IPeriodType extends RowDataPacket {
  period_type: number;
  period: string;
  description: string;
};

export async function Publish(Period: string): Promise<number> {
  const key = UniqueKey('');
  const set = await Modify(`INSERT IGNORE INTO period_type VALUES (UNHEX(?), ?, 'Desription Pending')`, [key, Period]);
  const get = await Select<IPeriodType>('SELECT period_type FROM period_type WHERE period = ?', [Period]);

  /*@ts-ignore*/
  return (get.length === 0 ? set.insertId : get[0].period_type);
};
