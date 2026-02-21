//+---------------------------------------------------------------------------------------+
//|                                                                       subject_area.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "#api";

import { Select, Insert, PrimaryKey } from "#db/query.utils";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

export interface ISubjectArea {
  subject_area: Uint8Array;
  title: string;
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports subject area seed data to the database;                                      |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Subject.Area.Import:", new Date().toLocaleString());

  const areas: Array<Partial<ISubjectArea>> = [
    { title: "Instruments", description: "Administration of Instruments including currencies, types, and contracts;" },
    { title: "Trading", description: "Job/Symbol operations and parameter configuration;" },
    { title: "Users", description: "User management and administration including roles, privileges, and authorized activities;" },
    { title: "Accounts", description: "Account administration including keys, brokers, and operational availability;" },
    { title: "Jobs", description: "Operational management of Jobs including starts, stoppages, and monitoring;" },
  ];
  const result = await Promise.all(areas.map(async (area) => Add(area)));
  const exists = result.filter((r) => r.response.code === 200);
  console.log(
    `-> Subject.Area.Import complete:`,
    exists.length - result.length ? `${result.filter((r) => r.response.success).length} new areas;` : `No new areas;`,
    `${exists.length} areas verified;`,
  );
};

//+--------------------------------------------------------------------------------------+
//| Adds subject areas to local database;                                                |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<ISubjectArea>): Promise<IPublishResult<ISubjectArea>> => {
  Object.assign(props, { subject_area: hashKey(6) });
  const result = await Insert<ISubjectArea>(props, { table: `subject_area`, ignore: true });
  return { key: PrimaryKey(props, ["subject_area"]), response: result };
};

//+--------------------------------------------------------------------------------------+
//| Returns subject area key based on supplied seek params;                              |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<ISubjectArea>): Promise<ISubjectArea["subject_area"] | undefined> => {
  if (hasValues<Partial<ISubjectArea>>(props)) {
    const result = await Select<ISubjectArea>(props, { table: `subject_area` });
    return result.success && result.data?.length ? result.data[0].subject_area : undefined;
  }
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches subject area by key/area; returns all when requesting an empty prop set {};  |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: ISubjectArea): Promise<Array<Partial<ISubjectArea>> | undefined> => {
  const result = await Select<ISubjectArea>(props, { table: `subject_area` });
  return result.success ? result.data : undefined;
};
