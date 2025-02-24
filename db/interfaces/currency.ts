//+------------------------------------------------------------------+
//|                                                      currency.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface ICurrency extends RowDataPacket {
  currency: number;
  symbol: string;
  image_url: string;
  suspense: boolean;
}

export async function Publish(symbol: string, suspense: boolean): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(
    `INSERT INTO currency (currency, symbol, image_url, suspense) 
        VALUES (UNHEX(?), ?, './public/images/currency/no-image.png', ?) ON DUPLICATE KEY UPDATE suspense = ?`,
    [key, symbol, suspense, suspense]
  );
  const get = await Select<ICurrency>("SELECT currency FROM currency WHERE symbol = ?", [symbol]);

  return get.length === 0 ? set.insertId : get[0].currency!;
}
