//+---------------------------------------------------------------------------------------+
//|                                                                           activity.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { SubjectArea } from "@db/interfaces/subject";

import { Modify, Select } from "@db/query.utils";
import { hashKey } from "@/lib/crypto.util";

import * as Subject from "@db/interfaces/subject";

export interface IKeyProps {
  activity?: Uint8Array;
  task?: string;
}
export interface IActivity extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Imports seed task data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
export const Import = () => {
  Publish("Users", "User");
  Publish("Accounts", "Account");
  Publish("Jobs", "Account");
};

//+--------------------------------------------------------------------------------------+
//| Adds new Tasks to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export async function Publish(task: string, area: SubjectArea): Promise<IKeyProps["activity"]> {
  const activity = await Key({ task });
  if (activity === undefined) {
    const [{ subject }] = await Subject.Fetch({ area });
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.activity VALUES (?, ?, ?)`, [key, task, subject]);
    return key;
  }
  return activity;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["activity"] | undefined> {
  const { activity, task } = props;
  const args = [];

  let sql: string = `SELECT task FROM blofin.activity WHERE `;

  if (activity) {
    args.push(activity);
    sql += `activity = ?`;
  } else if (task) {
    args.push(task);
    sql += `task = ?`;
  } else return undefined;

  const [key] = await Select<IActivity>(sql, args);
  return key === undefined ? undefined : key.activity;
}

//+--------------------------------------------------------------------------------------+
//| Fetches activities/tasks by key/task; returns all when requesting an empty set {};   |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
  const { activity, task } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.activity`;

  if (activity) {
    args.push(activity);
    sql += ` WHERE activity = ?`;
  } else if (task) {
    args.push(task);
    sql += ` WHERE task = ?`;
  }

  return Select<IActivity>(sql, args);
}
