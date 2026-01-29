//+--------------------------------------------------------------------------------------+
//|                                                                       environment.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "db/query.utils";

import { Select, Insert, PrimaryKey } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

export interface IEnvironment {
  environment: Uint8Array;
  environ: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports environments seed data to the database;                                      |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Environment.Import:", new Date().toLocaleString());
 
  const environments: Array<string> = ["Production", "Development", "Test", "Quality Assurance (QA)"];
  const result = await Promise.all(environments.map(async (environ) => Add({ environ })));
  const exists = result.filter((r) => r.response.code === 200);
  console.log(
    `-> Environment.Import complete:`,
    exists.length - result.length ? `${result.filter((r) => r.response.success).length} new environments;` : `No new environments;`,
    `${exists.length} environments verified;`
  );
};

//+--------------------------------------------------------------------------------------+
//| Adds seed environments to local database;                                            |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IEnvironment>): Promise<IPublishResult<IEnvironment>> => {
  Object.assign(props, { environment: hashKey(6) });
  const result = await Insert<IEnvironment>(props, { table: `environment`, ignore: true, context: "Environment.Add" });
  return { key: PrimaryKey(props, ["environment"]), response: result };
};

//+--------------------------------------------------------------------------------------+
//| Returns an environment key using supplied params;                                    |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IEnvironment>): Promise<IEnvironment["environment"] | undefined> => {
  if (hasValues<Partial<IEnvironment>>(props)) {
    const [result] = await Select<IEnvironment>(props, { table: `environment` });
    return result ? result.environment : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns environments meeting supplied criteria; returns all if empty props supplied; |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IEnvironment>): Promise<Array<Partial<IEnvironment>> | undefined> => {
  const result = await Select<IEnvironment>(props, { table: `environment` });
  return result.length ? result : undefined;
};
