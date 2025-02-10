import pool from "./db.config";

import { customAlphabet } from "nanoid";
import { ResultSetHeader } from "mysql2";

export async function Select<T>(
  Query: string,
  Fields: Array<any>
): Promise<Partial<T>[]> {
  const [results] = await pool.execute(Query, Fields);
  return results as T[];
}

export async function Modify(
  Query: string,
  Fields: Array<any>
): Promise<ResultSetHeader> {
  const [results] = await pool.execute(Query, Fields);
  return results as ResultSetHeader;
}

export const UniqueKey = (Key: string): string => {
  const nanoid = customAlphabet("0123456789abcdef", 6);
  const key = nanoid();

  if (Key.length > 0) console.log([Key, key]);

  return key;
};
