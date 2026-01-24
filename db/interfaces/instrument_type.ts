//+----------------------------------------------------------------------------------------+
//|                                                                     instrument_type.ts |
//|                                                       Copyright 2018, Dennis Jorgenson |
//+----------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "db/query.utils";

import { Select, Insert, PrimaryKey, Update } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

export interface IInstrumentType {
  instrument_type: Uint8Array | string;
  source_ref: string;
  description: string;
}

//+----------------------------------------------------------------------------------------+
//| Adds all new instrument types recieved from Blofin to the database;                    |
//+----------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrumentType>): Promise<IPublishResult<IInstrumentType>> => {
  if (hasValues(props)) {
    const search = {
      instrument_type: typeof props.instrument_type === "string" ? undefined : props.instrument_type,
      source_ref: typeof props.instrument_type === "string" ? props.instrument_type : props.source_ref,
    };
    const exists = await Key(search);

    if (exists) {
      if (hasValues<Partial<IInstrumentType>>({ description: props.description })) {
        const [current] = (await Fetch({ instrument_type: exists })) ?? [];
        if (current) {
          const revised = {
            instrument_type: current.instrument_type,
            description: props.description ? (props.description === current.description ? undefined : props.description) : undefined,
          };
          const result = await Update<IInstrumentType>(revised, { table: `instrument_type`, keys: [{ key: `instrument_type` }] });
          return { key: PrimaryKey(current, ["instrument_type"]), response: result };
        }
      }
      return { key: PrimaryKey({instrument_type: exists}, ["instrument_type"]), response: { success: true, code: 201, response: `exists`, rows: 0 } };
    } else {
      const missing = {
        instrument_type: hashKey(6),
        source_ref: search.source_ref,
        description: props.description || "Description pending",
      };
      const result = await Insert<IInstrumentType>(missing, { table: `instrument_type` });
      return { key: PrimaryKey(missing, ["instrument_type"]), response: result };
    }
  }
  return { key: undefined, response: { success: false, code: 411, response: `null_query`, rows: 0 } };
};

//+--------------------------------------------------------------------------------------+
//| Returns an instrument type key using supplied params;                                      |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IInstrumentType>): Promise<IInstrumentType["instrument_type"] | undefined> => {
  if (hasValues<Partial<IInstrumentType>>(props)) {
    const [result] = await Select<IInstrumentType>(props, { table: `instrument_type` });
    return result ? result.instrument_type : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns instrument types meeting supplied criteria; retrieves all on empty props {}; |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IInstrumentType>): Promise<Array<Partial<IInstrumentType>> | undefined> => {
  const result = await Select<IInstrumentType>(props, { table: `instrument_type` });
  return result.length ? result : undefined;
};
