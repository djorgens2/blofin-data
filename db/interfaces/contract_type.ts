//+--------------------------------------------------------------------------------------+
//|                                                                     contract_type.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

export interface IContractType {
  contract_type: Uint8Array;
  source_ref: string;
  description: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports contract types seed data to the database;                                    |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Contract.Type.Import:", new Date().toLocaleString());

  const success: Array<Partial<IContractType>> = [];
  const errors: Array<Partial<IContractType>> = [];
  const contract_types: Array<string> = ["linear", "inverse"];

   for (const contract_type of contract_types) {
     const result = await Publish({source_ref: contract_type});
     result ? success.push({ contract_type: result }) : errors.push({ source_ref: contract_type });
   }
 
   success.length && console.log("   # Contract Type imports: ", success.length, "verified");
   errors.length && console.log("   # Contract Type rejects: ", errors.length, { errors });
 };
 
//+--------------------------------------------------------------------------------------+
//| Adds contract types to local database;                                               |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IContractType>) => {
  if (props.contract_type === undefined) {
    const contract_type = await Key({ source_ref: props.source_ref });

    if (contract_type === undefined) {
      Object.assign(props, { contract_type: hashKey(6) });
      const result = await Insert<IContractType>(props, { table: `contract_type`, ignore: true });
      return result ? result.contract_type : undefined;
    } else return contract_type;
  }
};

//+--------------------------------------------------------------------------------------+
//| Returns a contract type key using supplied params;                                   |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IContractType>): Promise<IContractType["contract_type"] | undefined> => {
  if (Object.keys(props).length) {
    const [key] = await Select<IContractType>(props, { table: `contract_type` });
    return key ? key.contract_type : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns contract types meeting supplied criteria; all on prop set {};                |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IContractType>): Promise<Array<Partial<IContractType>> | undefined> => {
  const result = await Select<IContractType>(props, { table: `contract_type` });
  return result.length ? result : undefined;
};
