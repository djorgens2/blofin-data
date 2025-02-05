import { Select, Modify } from "../query.utils";
import type { RowDataPacket } from "mysql2";

export interface ICurrency extends RowDataPacket {
  currrency: number;
  symbol: string;
  image_url: string;
}

export function all() {
  return Select<ICurrency>("SELECT * FROM currency;");
}

export function bySymbol(Symbol: string) {
  return Select<ICurrency>(`SELECT * FROM currency WHERE symbol = '${Symbol}';`);
}

export function add(Symbol: string, ImageURL: string) {
  return Modify(`INSERT INTO currency (symbol, image_url) VALUES ('${Symbol}','${ImageURL}');`);
}