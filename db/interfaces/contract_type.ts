//+--------------------------------------------------------------------------------------+
//|                                                                     contract_type.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export interface IKeyProps {
  contract_type?: Uint8Array;
  source_ref?: string;
}

export interface IContractType extends IKeyProps, RowDataPacket {
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds all new contract types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(source_ref: string): Promise<IKeyProps["contract_type"]> {
  const contractType = await Key({ source_ref });

  if (contractType === undefined) {
    const key = hex(UniqueKey(6), 3);
    await Modify(`INSERT INTO blofin.contract_type VALUES (?, ?, 'Description Pending')`, [key, source_ref]);

    return key;
  }
  return contractType;
}

//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["contract_type"] | undefined> {
  const { contract_type, source_ref } = props;
  const args = [];

  let sql: string = `SELECT contract_type FROM blofin.contract_type WHERE `;

  if (contract_type) {
    args.push(hex(contract_type, 3));
    sql += `contract_type = ?`;
  } else if (source_ref) {
    args.push(source_ref);
    sql += `source_ref = ?`;
  } else return undefined;

  const [key] = await Select<IContractType>(sql, args);
  return key === undefined ? undefined : key.contract_type;
}
