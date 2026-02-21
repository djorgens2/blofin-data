//+--------------------------------------------------------------------------------------+
//|                                                                     contract_type.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, TResponse } from "#api";

import { Select, Insert, Update, PrimaryKey } from "#db";
import { hashKey } from "#lib/crypto.util";
import { hasValues } from "#lib/std.util";

export interface IContractType {
  contract_type: Uint8Array | string;
  source_ref: string;
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Adds contract types to local database;                                               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IContractType>): Promise<IPublishResult<IContractType>> => {
  const context = "Contract.Type.Publish";
  const publishResult: TResponse = {
    success: false,
    state: "error",
    message: `[Error] ${context}:`,
    code: -1,
    rows: 0,
    context,
  };

  if (!hasValues(props)) {
    return { key: undefined, response: { ...publishResult, code: 410, state: `null_query` } };
  }

  const search = {
    contract_type: typeof props.contract_type === "string" ? undefined : props.contract_type,
    source_ref: typeof props.contract_type === "string" ? props.contract_type : props.source_ref,
  };

  const exists = await Key(search);

  if (exists) {
    if (hasValues<Partial<IContractType>>({ description: props.description })) {
      const [current] = (await Fetch({ contract_type: exists })) ?? [];
      if (current) {
        const revised = {
          contract_type: current.contract_type,
          description: props.description ? (props.description === current.description ? undefined : props.description) : undefined,
        };
        const result = await Update<IContractType>(revised, { table: `contract_type`, keys: [[`contract_type`]], context });
        return { key: PrimaryKey(current, ["contract_type"]), response: result };
      }
    }
    return {
      key: PrimaryKey({ contract_type: exists }, ["contract_type"]),
      response: { ...publishResult, success: true, code: 201, state: `exists` },
    };
  }

  const missing = {
    contract_type: hashKey(6),
    source_ref: search.source_ref,
    description: props.description || "Description pending",
  };
  const result = await Insert<IContractType>(missing, { table: `contract_type`, context });

  return { key: PrimaryKey(missing, ["contract_type"]), response: result };
};

//+--------------------------------------------------------------------------------------+
//| Returns a contract type key using supplied params;                                   |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IContractType>): Promise<IContractType["contract_type"] | undefined> => {
  if (hasValues<Partial<IContractType>>(props)) {
    const result = await Select<IContractType>(props, { table: `contract_type` });
    return result.success && result.data?.length ? result.data[0].contract_type : undefined;
  }
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns contract types meeting supplied criteria; all on prop set {};                |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IContractType>): Promise<Array<Partial<IContractType>> | undefined> => {
  const result = await Select<IContractType>(props, { table: `contract_type` });
  return result.success ? result.data : undefined;
};
