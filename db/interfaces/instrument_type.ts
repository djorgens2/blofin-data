//+----------------------------------------------------------------------------------------+
//|                                                                     instrument_type.ts |
//|                                                       Copyright 2018, Dennis Jorgenson |
//+----------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export interface IKeyProps {
  instrument_type?: Uint8Array;
  source_ref?: string;
}

export interface IInstrumentType extends IKeyProps, RowDataPacket {
  description: string;
}

//+----------------------------------------------------------------------------------------+
//| Adds all new instrument types recieved from Blofin to the database;                    |
//+----------------------------------------------------------------------------------------+
export async function Publish(source_ref: string): Promise<IKeyProps["instrument_type"]> {
  const instrument_type = await Key({ source_ref });

  if (instrument_type === undefined) {
    const key = hex(UniqueKey(6), 3);

    await Modify(`INSERT INTO instrument_type VALUES (?, ?, 'Description Pending')`, [key, source_ref]);

    return key;
  }
  return instrument_type;
}

//+----------------------------------------------------------------------------------------+
//| Examines instrument type search methods in props; executes first in priority sequence; |
//+----------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["instrument_type"] | undefined> {
  const args = [];

  let sql: string = `SELECT instrument_type FROM instrument_type WHERE `;

  if (props.instrument_type) {
    args.push(hex(props.instrument_type, 3));
    sql += `instrument_type = ?`;
  } else if (props.source_ref) {
    args.push(props.source_ref);
    sql += `source_ref = ?`;
  } else return undefined;

  const [key] = await Select<IInstrumentType>(sql, args);
  return key === undefined ? undefined : key.instrument_type;
}
