import { Select, Modify, UniqueKey } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface ICurrency extends RowDataPacket {
  currrency: number;
  symbol: string;
  image_url: string;
  suspense: boolean;
}

export async function Publish(
  Symbol: string,
  Suspense: boolean
): Promise<number> {
  const key = UniqueKey("");
  const set = await Modify(
    `INSERT INTO currency (currency, symbol, image_url, suspense) 
        VALUES (UNHEX(?), ?, './public/images/currency/no-image.png', ?) ON DUPLICATE KEY UPDATE suspense = ?`,
    [key, Symbol, Suspense, Suspense]
  );
  const get = await Select<ICurrency>(
    "SELECT currency FROM currency WHERE symbol = ?",
    [Symbol]
  );

  return get.length === 0 ? set.insertId : get[0].currency;
}
