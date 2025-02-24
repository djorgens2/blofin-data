//+------------------------------------------------------------------+
//|                                               instrument_type.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict"

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface IInstrumentType extends RowDataPacket {
  instrument_type: number;
  source_ref: string;
  description: string;
}

export async function Publish(sourceRef: string): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(`INSERT IGNORE INTO instrument_type VALUES (UNHEX(?), ?, 'Description Pending')`, [key, sourceRef]);
  const get = await Select<IInstrumentType>(`SELECT instrument_type FROM instrument_type WHERE source_ref = ?`, [sourceRef]);

  return get.length === 0 ? set.insertId : get[0].instrument_type!;
}
