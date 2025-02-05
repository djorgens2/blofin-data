import { Select } from "../query.utils";
import type { RowDataPacket } from "mysql2";

export interface IPeriod extends RowDataPacket {
  period_type: number;
  description: string;
  short_name: string;
}

export function all() {
  return Select<IPeriod>("SELECT * FROM period_type;");
}

export function byPeriod(period_type: string) {
  return Select<IPeriod>(`SELECT * FROM period_type WHERE short_name = '${period_type}';`);
}
