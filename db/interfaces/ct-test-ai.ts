/**
 * @file contract_type.ts
 * @description Manages normalized Contract Type definitions with IPublishResult patterns.
 * @copyright 2026, Dennis Jorgenson
 */

import { Select, Insert, Update } from "db/query.utils";
import { PrimaryKey } from "api/api.util";
import { hashKey } from "lib/crypto.util";
import { hasValues, NormalizeHex } from "lib/std.util";
import { IPublishResult, IContractType, TResponse } from "api/types"; // Adjusted for module standard

/**
 * Factory to generate a default TResponse object.
 * @param {string} context - The operational context (e.g., 'Contract.Type.Publish')
 * @returns {TResponse} A base response template.
 */
const BaseResponse = (context: string): TResponse => ({
  success: false,
  response: "initial",
  code: -1,
  rows: 0,
  context,
  message: "",
});

/**
 * Publishes (Inserts or Updates) contract types to the local database.
 * Uses a normalized search strategy to resolve source references to local hex keys.
 * 
 * @param {Partial<IContractType>} props - The incoming contract type data.
 * @returns {Promise<IPublishResult<IContractType>>} The standardized publish result.
 */
export const Publish = async (props: Partial<IContractType>): Promise<IPublishResult<IContractType>> => {
  const context = "Contract.Type.Publish";
  const resultHeader = BaseResponse(context);

  // 1. Runtime Validation & Normalization
  if (!hasValues(props)) {
    return { 
      key: undefined, 
      response: { ...resultHeader, code: 410, response: "null_query", message: "No data provided" } 
    };
  }

  // Normalize hex fields (account, contract_type, etc.)
  const cleanProps = NormalizeHex(props);

  // 2. Resolve Identifier (Source Ref vs. Hex Key)
  const search: Partial<IContractType> = {
    ...(typeof props.contract_type === "string" 
      ? { source_ref: props.contract_type } 
      : { contract_type: cleanProps.contract_type })
  };

  const existingKey = await Key(search);

  // 3. Update Branch (Exists)
  if (existingKey) {
    const [current] = (await Fetch({ contract_type: existingKey })) ?? [];
    
    if (current) {
      const revised: Partial<IContractType> = {
        contract_type: current.contract_type,
        // Only update description if it actually changed
        ...(props.description && props.description !== current.description 
          ? { description: props.description } 
          : {})
      };

      // Only fire Update if there are actual changes beyond the key
      if (Object.keys(revised).length > 1) {
        const result = await Update<IContractType>(revised, { 
          table: "contract_type", 
          keys: [["contract_type"]], // Pristine Tuple
          context 
        });
        return { key: PrimaryKey(current, [["contract_type"]]), response: result };
      }
    }

    return {
      key: PrimaryKey({ contract_type: existingKey }, [["contract_type"]]),
      response: { ...resultHeader, success: true, code: 201, response: "exists", message: "Contract type up to date" },
    };
  }

  // 4. Insert Branch (New)
  const missing: IContractType = {
    contract_type: hashKey(6),
    source_ref: search.source_ref || "manual_entry",
    description: props.description || "Description pending",
  };

  const result = await Insert<IContractType>(missing, { table: "contract_type", context });

  return { 
    key: PrimaryKey(missing, ["contract_type"]), 
    response: result 
  };
};

/**
 * Resolves a contract type key using supplied criteria.
 * @param {Partial<IContractType>} props - Search criteria.
 * @returns {Promise<IContractType["contract_type"] | undefined>} The resolved key.
 */
export const Key = async (props: Partial<IContractType>): Promise<IContractType["contract_type"] | undefined> => {
  if (!hasValues(props)) return undefined;
  
  const [result] = await Select<IContractType>(props, { table: "contract_type", limit: 1 });
  return result?.contract_type;
};

/**
 * Fetches contract types matching supplied criteria.
 * @param {Partial<IContractType>} props - Selection criteria.
 * @returns {Promise<Array<Partial<IContractType>> | undefined>} Array of results or undefined.
 */
export const Fetch = async (props: Partial<IContractType>): Promise<Array<Partial<IContractType>> | undefined> => {
  const result = await Select<IContractType>(props, { table: "contract_type" });
  return result.length ? result : undefined;
};
