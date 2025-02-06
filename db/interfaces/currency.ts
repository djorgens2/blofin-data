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

export function add(Symbol: string, ImageURL: string, Suspense: boolean) {
  return Modify(`INSERT INTO currency (symbol, image_url, suspense) VALUES ('${Symbol}','${ImageURL}', ${Suspense});`);
}

export function setSuspense(Currency: number,  Suspense: boolean) {
  return Modify(`UPDATE currency SET (suspense) VALUES (${Suspense}) WHERE currency = ${Currency};`);
}

export function setImageURL(Currency: number,  ImageURL: string) {
  return Modify(`UPDATE currency SET (image_url) VALUES ('${ImageURL}') WHERE currency = ${Currency};`);
}
