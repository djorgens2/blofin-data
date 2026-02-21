//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_detail.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "#db";

import { Insert, Update, PrimaryKey } from "#db/query.utils";
import { isEqual } from "#lib/std.util";
import { Instrument, InstrumentType, ContractType } from "#db";

//+--------------------------------------------------------------------------------------+
//| Inserts Instrument Details on receipt of a new Instrument from Blofin; returns key;  |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrument>) => {
  if (!props.instrument) {
    return { key: undefined, response: { success: false, code: 414, category: `null_query`, rows: 0 } };
  }

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
  if (result.success) {
    const confirm = await Update(
      { instrument: current.instrument, update_time: props.update_time || new Date() },
      { table: `instrument_detail`, keys: [[`instrument`]], context: "Instrument.Detail.Publish" },
    );
    return { key: PrimaryKey(revised, ["instrument"]), response: confirm };
  }
  return { key: PrimaryKey(revised, ["instrument"]), response: result };
};
