//+---------------------------------------------------------------------------------------+
//|                                                                           activity.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { ISubjectArea } from "db/interfaces/subject_area";

import { Select, Insert } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

import * as SubjectArea from "db/interfaces/subject_area";

export interface IActivity extends ISubjectArea {
  activity: Uint8Array;
  task: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports activity seed data to the database;                                          |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Activity.Import:", new Date().toLocaleString());

  const success: Array<Partial<IActivity>> = [];
  const errors: Array<Partial<IActivity>> = [];

  const activities: Array<Partial<IActivity>> = [
    { title: "Instruments", task: "Manage Instruments" },
    { title: "Instruments", task: "View/Modify Contracts" },
    { title: "Instruments", task: "View/Modify Instrument Types" },
    { title: "Trading", task: "Configure trading options" },
    { title: "Users", task: "Manage Users" },
    { title: "Accounts", task: "Account Administration" },
    { title: "Jobs", task: "Configure jobs" },
    { title: "Jobs", task: "Monitor jobs" },
  ];

  for (const activity of activities) {
    const result = await Add(activity);
    result ? success.push({ subject_area: result }) : errors.push({ task: activity.title });
  }

  success.length && console.log("   # Activity imports: ", success.length, "verified");
  errors.length && console.log("   # Activity rejects: ", errors.length, { errors });
};

//+--------------------------------------------------------------------------------------+
//| Add an activity to local database;                                                   |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IActivity>): Promise<IActivity["activity"] | undefined> => {
  if (props.activity === undefined) {
    const subject_area = await SubjectArea.Key({ title: props.title });

    if (subject_area === undefined) throw new Error("Unauthorized data import attempt; Subject Area not found;");
    else {
      const activity = hashKey(6);
      const result = await Insert<IActivity>({ activity, subject_area, task: props.task }, { table: `activity`, ignore: true });
      return result ? result.activity : undefined;
    }
  } else return props.activity;
};

//+--------------------------------------------------------------------------------------+
//| Returns an activity key using supplied params;                                       |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IActivity>): Promise<IActivity["activity"] | undefined> => {
  if (hasValues<Partial<IActivity>>(props)) {
    const [result] = await Select<IActivity>(props, { table: `activity` });
    return result ? result.activity : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns activities meeting supplied criteria; returns all on empty prop set {};      |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IActivity>): Promise<Array<Partial<IActivity>> | undefined> => {
  const result = await Select<IActivity>(props, { table: `activity` });
  return result.length ? result : undefined;
};
