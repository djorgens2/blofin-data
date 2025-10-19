//+----------------------------------------------------------------------------------------+
//|                                                                     instrument_type.ts |
//|                                                       Copyright 2018, Dennis Jorgenson |
//+----------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

export interface IInstrumentType {
  instrument_type: Uint8Array;
  source_ref: string;
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports known instrument types seed data to the database;                            |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Instrument.Type.Import:", new Date().toLocaleString());

  const success: Array<Partial<IInstrumentType>> = [];
  const errors: Array<Partial<IInstrumentType>> = [];
  const types: Array<string> = ["SWAP"];

  for (const type of types) {
    const result = await Publish({ source_ref: type, description: "Description pending;" });
    result ? success.push({ instrument_type: result }) : errors.push({ source_ref: type });
  }

  success.length && console.log("   # Instrument Type imports: ", success.length, "verified");
  errors.length && console.log("   # Instrument Type rejects: ", errors.length, { errors });
};

//+----------------------------------------------------------------------------------------+
//| Adds all new instrument types recieved from Blofin to the database;                    |
//+----------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrumentType>): Promise<IInstrumentType["instrument_type"] | undefined> => {
  if (props.instrument_type === undefined) {
    const instrument_type = await Key({ source_ref: props.source_ref });

    if (instrument_type === undefined) {
      Object.assign(props, { instrument_type: hashKey(6) });
      const result = await Insert<IInstrumentType>(props, { table: `instrument_type` });
      return result ? result.instrument_type : undefined;
    } else return instrument_type;
  }
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
