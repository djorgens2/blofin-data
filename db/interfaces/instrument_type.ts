//+------------------------------------------------------------------+
//|                                               instrument_type.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { RowDataPacket } from "mysql2";
import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export interface IInstrumentType extends RowDataPacket {
  instrument_type: Uint8Array;
  source_ref: string;
  description: string;
}

export interface IKeyProps {
  instrumentType?: Uint8Array;
  sourceRef?: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds all new instrument types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(sourceRef: string): Promise<Uint8Array> {
  const instrumentType = await Key({ sourceRef });

  if (instrumentType === undefined) {
    const key = hex(UniqueKey(6), 3);

    await Modify(`INSERT INTO instrument_type VALUES (?, ?, 'Description Pending')`, [key, sourceRef]);

    return key;
  }
  return instrumentType;
}

//+--------------------------------------------------------------------------------------+
//| Examines instrument type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key<T extends IKeyProps>(props: T): Promise<Uint8Array | undefined> {
  const args = [];

  if (props.instrumentType) {
    args.push(hex(props.instrumentType, 3), `SELECT instrument_type FROM instrument_type WHERE instrument_type = ?`);
  } else if (props.sourceRef) {
    args.push(props.sourceRef, `SELECT instrument_type FROM instrument_type WHERE source_ref = ?`);
  } else return undefined;

  const [key] = await Select<IInstrumentType>(args[1].toString(), [args[0]]);
  return key === undefined ? undefined : key.instrument_type;
}
