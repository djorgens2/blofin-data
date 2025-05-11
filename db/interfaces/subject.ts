//+---------------------------------------------------------------------------------------+
//|                                                                            subject.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, Select } from "@db/query.utils";
import { hashKey } from "@/lib/crypto.util";

export const Subject = {
  Period: "Period",
  Instrument: "Instrument",
  Currency: "Currency",
  State: "State",
  Contract: "Contract",
  Broker: "Broker",
  Account: "Account",
  User: "User",
} as const;
export type Subject = (typeof Subject)[keyof typeof Subject];
export const Subjects: Array<Subject> = ["Period", "Instrument", "Currency", "State", "Contract", "Broker", "Account", "User"];

export interface IKeyProps {
  subject?: Uint8Array;
  area?: Subject;
}
export interface ISubject extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Imports seed Subject data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
export const Import = () => Subjects.forEach((area) => Publish(area));

//+--------------------------------------------------------------------------------------+
//| Adds new subjects to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(area: Subject): Promise<IKeyProps["subject"]> {
  const subject = await Key({ area });
  if (subject === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.subject VALUES (?, ?)`, [key, area]);
    return key;
  }
  return subject;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["subject"] | undefined> {
  const { subject, area } = props;
  const args = [];

  let sql: string = `SELECT area FROM blofin.subject WHERE `;

  if (subject) {
    args.push(subject);
    sql += `subject = ?`;
  } else if (area) {
    args.push(area);
    sql += `area = ?`;
  } else return undefined;

  const [key] = await Select<ISubject>(sql, args);
  return key === undefined ? undefined : key.subject;
}

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
  const { subject, area } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.subject`;

  if (subject) {
    args.push(subject);
    sql += ` WHERE subject = ?`;
  } else if (area) {
    args.push(area);
    sql += ` WHERE area = ?`;
  }

  return Select<ISubject>(sql, args);
}
