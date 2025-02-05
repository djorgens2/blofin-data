import { ResultSetHeader } from "mysql2";
import pool from "./db.config";

export async function Select<T>(Query: string): Promise<Partial<T>[]> {
  const [results] = await pool.execute(Query);
  return results as T[];
}

export async function Modify(Query: string): Promise<ResultSetHeader> {
  const [results] = await pool.execute(Query);
  return results as ResultSetHeader;
}
