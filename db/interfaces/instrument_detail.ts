/**
 * Market Specification and Trading Constraints.
 * 
 * Manages the granular technical rules for instruments (tick size, lot size, 
 * leverage limits). This module acts as a synchronization hub, ensuring 
 * that associated Instrument and Contract Types are provisioned whenever 
 * detail updates are processed.
 * 
 * @module db/instrument_detail
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IInstrument } from "#db";
import { Insert, Update, PrimaryKey } from "#db/query.utils";
import { isEqual } from "#lib/std.util";
import { Instrument, InstrumentType, ContractType } from "#db";

/**
 * Synchronizes detailed instrument specifications from the broker.
 * 
 * Logic Flow:
 * 1. Validates the existence of the parent `instrument` hash.
 * 2. Parallel Resolution: Checks for existing details while simultaneously 
 *    triggering {@link InstrumentType.Publish} and {@link ContractType.Publish}.
 * 3. If Missing: Performs an {@link Insert} including the resolved type hashes.
 * 4. If Exists: Executes a "diff-check" to update only modified technical specs.
 * 5. Confirmation: If the update succeeds, a final write stamps the `update_time`.
 * 
 * @param props - Full or partial instrument data received from the exchange API.
 * @returns A promise resolving to the publication result and the instrument primary key.
 */
export const Publish = async (props: Partial<IInstrument>) => {
  if (!props.instrument) {
    return { key: undefined, response: { success: false, code: 414, category: `null_query`, rows: 0 } };
  }

  // Resolves dependencies and checks for existing record in parallel
  const [exists, instrument_type, contract_type] = await Promise.all([
    Instrument.Fetch({ instrument: props.instrument }, { table: `instrument_detail` }),
    (await InstrumentType.Publish(props)).key?.instrument_type,
    (await ContractType.Publish(props)).key?.contract_type,
  ]);

  if (!exists) {
    const result = await Insert({ ...props, instrument_type, contract_type }, { table: `instrument_detail`, context: "Instrument.Detail.Publish" });
    return { key: PrimaryKey({ instrument: props.instrument }, ["instrument"]), response: result };
  }

  const [current] = exists;
  const revised: Partial<IInstrument> = {
    instrument: current.instrument,
    instrument_type: isEqual(instrument_type!, current.instrument_type!) ? undefined : instrument_type,
    contract_type: isEqual(contract_type!, current.contract_type!) ? undefined : contract_type,
    contract_value: isEqual(props.contract_value!, current.contract_value!) ? undefined : props.contract_value,
    max_leverage: isEqual(props.max_leverage!, current.max_leverage!) ? undefined : props.max_leverage,
    min_size: isEqual(props.min_size!, current.min_size!) ? undefined : props.min_size,
    lot_size: isEqual(props.lot_size!, current.lot_size!) ? undefined : props.lot_size,
    tick_size: isEqual(props.tick_size!, current.tick_size!) ? undefined : props.tick_size,
    max_limit_size: isEqual(props.max_limit_size!, current.max_limit_size!) ? undefined : props.max_limit_size,
    max_market_size: isEqual(props.max_market_size!, current.max_market_size!) ? undefined : props.max_market_size,
    list_time: isEqual(props.list_time!, current.list_time!) ? undefined : props.list_time,
    expiry_time: isEqual(props.expiry_time!, current.expiry_time!) ? undefined : props.expiry_time,
  };

  const result = await Update(revised, { table: `instrument_detail`, keys: [[`instrument`]], context: "Instrument.Detail.Publish" });
  
  // Double-Update Pattern: Confirms success before updating the timestamp
  if (result.success) {
    const confirm = await Update(
      { instrument: current.instrument, update_time: props.update_time || new Date() },
      { table: `instrument_detail`, keys: [[`instrument`]], context: "Instrument.Detail.Publish" },
    );
    return { key: PrimaryKey(revised, ["instrument"]), response: confirm };
  }
  
  return { key: PrimaryKey(revised, ["instrument"]), response: result };
};
