//+--------------------------------------------------------------------------------------+
//|                                                                          currency.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export interface IKeyProps {
  currency?: Uint8Array;
  symbol?: string;
}

export interface ICurrency extends IKeyProps, RowDataPacket {
  image_url: string;
  suspense: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Adds all new currencies recieved from Blofin to the database; defaults image         |
//+--------------------------------------------------------------------------------------+
export async function Publish(symbol: string, suspense: boolean): Promise<IKeyProps["currency"]> {
  const currency = await Key({ symbol });

  if (currency === undefined) {
    const key = hex(UniqueKey(6), 3);
    const defaultImage: string = "./public/images/currency/no-image.png";

    await Modify(`INSERT INTO blofin.currency (currency, symbol, image_url, suspense) VALUES (?, ?, ?, ?)`, [key, symbol, defaultImage, suspense]);
    return key;
  }
  return currency;
}

//+--------------------------------------------------------------------------------------+
//| Examines currency search methods in props; executes first in priority sequence;      |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["currency"] | undefined> {
  const { currency, symbol } = props;
  const args = [];

  let sql: string = `SELECT currency FROM blofin.currency WHERE `;

  if (currency) {
    args.push(hex(currency, 3));
    sql += `currency = ?`;
  } else if (symbol) {
    args.push(symbol);
    sql += `symbol = ?`;
  } else return undefined;

  const [key] = await Select<ICurrency>(sql, args);
  return key === undefined ? undefined : key.currency;
}

//+--------------------------------------------------------------------------------------+
//| Suspends provided currency upon receipt of an 'unalive' state from Blofin;           |
//+--------------------------------------------------------------------------------------+
export async function Suspend(suspensions: Array<IKeyProps>) {
  for (const props of suspensions) {
    const { currency, symbol } = props;
    const args = [];

    let sql: string = `UPDATE blofin.currency SET suspense = true WHERE `;

    if (currency) {
      args.push(hex(currency, 3));
      sql += `currency = ?`;
    } else if (symbol) {
      args.push(symbol);
      sql += `symbol = ?`;
    } else return;

    await Modify(sql, args);
  }
}
