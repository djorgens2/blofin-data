//+---------------------------------------------------------------------------------------+
//|                                                                       subject_area.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

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

  const success: Array<Partial<ISubjectArea>> = [];
  const errors: Array<Partial<ISubjectArea>> = [];

  const areas: Array<Partial<ISubjectArea>> = [
    { title: "Instruments", description: "Administration of Instruments including currencies, types, and contracts;" },
    { title: "Trading", description: "Job/Symbol operations and parameter configuration;" },
    { title: "Users", description: "User management and administration including roles, privileges, and authorized activities;" },
    { title: "Accounts", description: "Account administration including keys, brokers, and operational availability;" },
    { title: "Jobs", description: "Operational management of Jobs including starts, stoppages, and monitoring;" },
  ];

  for (const area of areas) {
    const result = await Add(area);
    result ? success.push({ subject_area: result }) : errors.push({ title: area.title });
  }

  success.length && console.log("   # Subject Area imports: ", success.length, "verified");
  errors.length && console.log("   # Subject Area rejects: ", errors.length, { errors });
};

//+--------------------------------------------------------------------------------------+
//| Adds subject areas to local database;                                                |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<ISubjectArea>) => {
  if (props.subject_area === undefined) {
    Object.assign(props, { subject_area: hashKey(6) });
    const result = await Insert<ISubjectArea>(props, { table: `subject_area`, ignore: true });
    return result ? result.subject_area : undefined;
  } else return props.subject_area;
};

//+--------------------------------------------------------------------------------------+
//| Returns subject area key based on supplied seek params;                              |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<ISubjectArea>): Promise<ISubjectArea["subject_area"] | undefined> => {
  if (hasValues<Partial<ISubjectArea>>(props)) {
    const [key] = await Select<ISubjectArea>(props, { table: `subject_area` });
    return key ? key.subject_area : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches subject area by key/area; returns all when requesting an empty prop set {};  |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: ISubjectArea): Promise<Array<Partial<ISubjectArea>> | undefined> => {
  const result = await Select<ISubjectArea>(props, { table: `subject_area` });
  return result.length ? result : undefined;
};
