//+--------------------------------------------------------------------------------------+
//|                                                                          currency.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { RowDataPacket } from "mysql2";
import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

export interface ICurrency extends RowDataPacket {
  currency: Uint8Array;
  symbol: string;
  image_url: string;
  suspense: boolean;
}

export interface IKeyProps {
  currency?: Uint8Array;
  symbol?: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds all new currencies recieved from Blofin to the database; defaults image         |
//+--------------------------------------------------------------------------------------+
export async function Publish(symbol: string, suspense: boolean): Promise<Uint8Array> {
  const currency = await Key({ symbol });

  if (currency === undefined) {
    const key = hex(UniqueKey(6),3);
    const defaultImage: string = './public/images/currency/no-image.png';

    await Modify(
      `INSERT INTO currency (currency, symbol, image_url, suspense) VALUES (?, ?, ?, ?)`,
      [key, symbol, defaultImage, suspense]
    );
    return key;
  }
  return currency;
}

//+--------------------------------------------------------------------------------------+
//| Examines currency search methods in props; executes first in priority sequence;      |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<Uint8Array | undefined> {
  const args = [];

  if (props.currency) {
    args.push(hex(props.currency, 3), `SELECT currency FROM currency WHERE currency = ?`);
  } else if (props.symbol) {
    args.push(props.symbol, `SELECT currency FROM currency WHERE symbol = ?`);
  } else return undefined;

  const [key] = await Select<ICurrency>(args[1].toString(), [args[0]]);
  return key === undefined ? undefined : key.currency;
}
