import { Select } from "../query.utils";
import type { RowDataPacket } from "mysql2";

export interface IInstrumentType extends RowDataPacket {
  instrument_type: number;
  description: string;
  short_name: string;
}

export function all() {
  return Select<IInstrumentType>("SELECT * FROM instrument_type;");
}

export function byType(Type: string) {
  return Select<IInstrumentType>(`SELECT * FROM instrument_type WHERE instrument_type = '${Type}';`);
}
