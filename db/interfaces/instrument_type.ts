import { Select, Modify, UniqueKey } from "../query.utils";
import { RowDataPacket } from "mysql2";

export interface IInstrumentType extends RowDataPacket {
  instrument_type: number;
  source_ref: string;
  description: string;
}

export async function Publish(SourceRef: string): Promise<number> {
  const key = UniqueKey("");
  const set = await Modify(
    `INSERT IGNORE INTO instrument_type VALUES (UNHEX(?), ?, 'Description Pending')`,
    [key, SourceRef]
  );
  const get = await Select<IInstrumentType>(
    "SELECT instrument_type FROM instrument_type WHERE source_ref = ?",
    [SourceRef]
  );

  /*@ts-ignore*/
  return get.length === 0 ? set.insertId : get[0].instrument_type;
}
