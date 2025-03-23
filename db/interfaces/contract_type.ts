//+--------------------------------------------------------------------------------------+
//|                                                                     contract_type.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { RowDataPacket } from "mysql2";
import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export interface IContractType extends RowDataPacket {
  contract_type: Uint8Array;
  source_ref: string;
  description: string;
}

export interface IKeyProps {
  contractType?: Uint8Array;
  sourceRef?: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds all new contract types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(sourceRef: string): Promise<Uint8Array> {
  const contractType = await Key({ sourceRef });

  if (contractType === undefined) {
    const key = hex(UniqueKey(6), 3);
    await Modify(`INSERT INTO contract_type VALUES (?, ?, 'Description Pending')`, [key, sourceRef]);

    return key;
  }
  return contractType;
}

//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<Uint8Array | undefined> {
  const args = [];

  if (props.contractType) {
    args.push(hex(props.contractType, 3), `SELECT contract_type FROM contract_type WHERE contract_type = ?`);
  } else if (props.sourceRef) {
    args.push(props.sourceRef, `SELECT contract_type FROM contract_type WHERE source_ref = ?`);
  } else return undefined;

  const [key] = await Select<IContractType>(args[1].toString(), [args[0]]);
  return key === undefined ? undefined : key.contract_type;
}
