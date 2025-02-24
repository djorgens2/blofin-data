//+------------------------------------------------------------------+
//|                                                 contract_type.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

interface IContractType extends RowDataPacket {
  contract_type: number;
  description: string;
  short_name: string;
}

export async function Publish(sourceRef: string): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(`INSERT IGNORE INTO contract_type VALUES (UNHEX(?), ?, 'Description Pending')`, [key, sourceRef]);
  const get = await Select<IContractType>("SELECT contract_type FROM contract_type WHERE source_ref = ?", [sourceRef]);

  return get.length === 0 ? set.insertId : get[0].contract_type!;
}
