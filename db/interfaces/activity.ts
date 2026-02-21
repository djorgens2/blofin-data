//+---------------------------------------------------------------------------------------+
//|                                                                           activity.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { ISubjectArea } from "#db";
import type { IPublishResult } from "#api";

import { Select, Insert, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

import { SubjectArea } from "#db";

export interface IActivity extends ISubjectArea {
  activity: Uint8Array;
  task: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports activity seed data to the database;                                          |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Activity.Import:", new Date().toLocaleString());

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

  const result = await Promise.all(activities.map(async (activity) => Add(activity)));
  const exists = result.filter((r) => r.response.code === 200);
  console.log(
    `-> Activity.Import complete:`,
    exists.length - result.length ? `${result.filter((r) => r.response.success).length} new activities;` : `No new activities;`,
    `${exists.length} activities verified;`,
  );
};

//+--------------------------------------------------------------------------------------+
//| Add an activity to local database;                                                   |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IActivity>): Promise<IPublishResult<IActivity>> => {
  if (props.activity) {
    return {
      key: PrimaryKey(props, ["activity"]),
      response: {
        success: false,
        code: 200,
        state: `exists`,
        message: `[Error] Activity add failed; duplicate activity found`,
        rows: 0,
        context: "Activity.Add",
      },
    };
  }

  const subject_area = await SubjectArea.Key({ title: props.title });

  if (subject_area) {
    const activity = hashKey(6);
    const result = await Insert<IActivity>({ activity, subject_area, task: props.task }, { table: `activity`, ignore: true });
    return { key: PrimaryKey({ activity }, ["activity"]), response: result };
  }
  console.log("Unauthorized data import attempt; Subject Area not found;");
  return { key: undefined, response: { success: false, code: 404, state: `not_found`, message: ``, rows: 0, context: "Activity.Add" } };
};

//+--------------------------------------------------------------------------------------+
//| Returns an activity key using supplied params;                                       |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IActivity>): Promise<IActivity["activity"] | undefined> => {
  if (hasValues<Partial<IActivity>>(props)) {
    const result = await Select<IActivity>(props, { table: `activity` });
    return result.success && result.data?.length ? result.data[0].activity : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns activities meeting supplied criteria; returns all on empty prop set {};      |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IActivity>): Promise<Array<Partial<IActivity>> | undefined> => {
  const result = await Select<IActivity>(props, { table: `activity` });
  return result.success ? result.data : undefined;
};
