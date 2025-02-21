import { RowDataPacket } from "mysql2";
import { Select, Modify, UniqueKey } from "@db/query.utils";

interface IContractType extends RowDataPacket {
  contract_type: number;
  description: string;
  short_name: string;
}

export async function Publish(SourceRef: string): Promise<number> {
  const key = UniqueKey("");
  const set = await Modify(
    `INSERT IGNORE INTO contract_type VALUES (UNHEX(?), ?, 'Desription Pending')`,
    [key, SourceRef]
  );
  const get = await Select<IContractType>(
    "SELECT contract_type FROM contract_type WHERE source_ref = ?",
    [SourceRef]
  );

  /*@ts-ignore*/
  return get.length === 0 ? set.insertId : get[0].contract_type;
}
