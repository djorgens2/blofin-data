//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_detail.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IInstrument } from "db/interfaces/instrument";

import { Insert, Update } from "db/query.utils";
import { isEqual } from "lib/std.util";

import * as Instruments from "db/interfaces/instrument";
import * as InstrumentTypes from "db/interfaces/instrument_type";
import * as ContractTypes from "db/interfaces/contract_type";

//+--------------------------------------------------------------------------------------+
//| Inserts Instrument Details on receipt of a new Instrument from Blofin; returns key;  |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IInstrument>)=> {
  if (props.instrument === undefined) throw new Error(`Unauthorized instrument publication; missing instrument`);
  else {
    const instrument = await Instruments.Fetch({ instrument: props.instrument });

    if (instrument === undefined) throw new Error(`Unathorized instrument publication; instrument not found`);
    else {
      const [current] = instrument;
      const instrument_type =
        typeof props.instrument_type === "string" && props.instrument_type !== current.instrument_type
          ? await InstrumentTypes.Publish({ source_ref: props.instrument_type })
          : undefined;
      const contract_type =
        typeof props.contract_type === "string" && props.contract_type !== current.contract_type
          ? await ContractTypes.Publish({ source_ref: props.contract_type })
          : undefined;

      if (current.list_time) {
        const revised: Partial<IInstrument> = {
          instrument: current.instrument,
          instrument_type,
          contract_type,
          contract_value: isEqual(props.contract_value!, current.contract_value!) ? undefined : props.contract_value,
          max_leverage: isEqual(props.max_leverage!, current.max_leverage!) ? undefined : props.max_leverage,
          min_size: isEqual(props.min_size!, current.min_size!) ? undefined : props.min_size,
          lot_size: isEqual(props.lot_size!, current.lot_size!) ? undefined : props.lot_size,
          tick_size: isEqual(props.tick_size!, current.tick_size!) ? undefined : props.tick_size,
          max_limit_size: isEqual(props.max_limit_size!, current.max_limit_size!) ? undefined : props.max_limit_size,
          max_market_size: isEqual(props.max_market_size!, current.max_market_size!) ? undefined : props.max_market_size,
          list_time: isEqual(props.list_time!, current.list_time) ? undefined : props.list_time,
          expiry_time: isEqual(props.expiry_time!, current.expiry_time!) ? undefined : props.expiry_time,
        };
        const [result, updates] = await Update(revised, { table: `instrument_detail`, keys: [{ key: `instrument` }] });
        result && console.log(`[Info] Instrument Details updated:`, { symbol: current.symbol, updates });
        return result ? result.instrument : undefined;
      } else {
        const result = await Insert({ ...props, instrument_type, contract_type }, { table: `instrument_detail` });
        return result ? result.instrument : undefined;
      }
    }
  }
};
