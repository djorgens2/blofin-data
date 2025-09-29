//+--------------------------------------------------------------------------------------+
//|                                                                       environment.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

export interface IEnvironment {
  environment: Uint8Array;
  environ: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports environments seed data to the database;                                      |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Environment.Import:", new Date().toLocaleString());
 
  const success: Array<Partial<IEnvironment>> = [];
  const errors: Array<Partial<IEnvironment>> = [];
  const environments: Array<string> = ["Production", "Development", "Test", "Quality Assurance (QA)"];

  for (const environ of environments) {
    const result = await Add({ environ });
    result ? success.push({ environment: result }) : errors.push({ environ });
  }

  success.length && console.log("   # Environment imports: ", success.length, "verified");
  errors.length && console.log("   # Environment rejects: ", errors.length, { errors });
};

//+--------------------------------------------------------------------------------------+
//| Adds seed environments to local database;                                            |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IEnvironment>): Promise<IEnvironment["environment"] | undefined> => {
  if (props.environment === undefined) {
    Object.assign(props, { environment: hashKey(6) });
    const result = await Insert<IEnvironment>(props, { table: `environment`, ignore: true });
    return result ? result.environment : undefined;
  } else return props.environment;
};

//+--------------------------------------------------------------------------------------+
//| Returns an environment key using supplied params;                                    |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IEnvironment>): Promise<IEnvironment["environment"] | undefined> => {
  if (Object.keys(props).length) {
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
