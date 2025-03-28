//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_detail.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { IInstrumentAPI } from "@/api/instruments";

import { Modify, Select } from "@db/query.utils";
import { hex } from "@/lib/std.util";

import * as Instrument from "@db/interfaces/instrument";
import * as ContractType from "@db/interfaces/contract_type";
import * as InstrumentType from "@db/interfaces/instrument_type";

export interface IInstrumentDetail extends IKeyProps, RowDataPacket {
  instrument_type: Uint8Array;
  contract_type: Uint8Array;
  contract_value: number;
  max_leverage: number;
  min_size: number;
  lot_size: number;
  tick_size: number;
  max_limit_size: number;
  max_market_size: number;
  list_time: number;
  expiry_time: number;
}

export interface IKeyProps {
  instrument?: Uint8Array;
}

//+--------------------------------------------------------------------------------------+
//| Inserts Instrument Details on receipt of a new Instrument from Blofin; returns key;  |
//+--------------------------------------------------------------------------------------+
export async function Publish(
  instrument: Uint8Array,
  instrumentType: Uint8Array,
  contractType: Uint8Array,
  api: IInstrumentAPI
): Promise<IKeyProps["instrument"] | undefined> {
  const key = await Instrument.Key({ instrument });
  const confirm = await Key({ instrument });

  if (key === undefined) return key;
  if (confirm === undefined) {
    await Modify(
      `INSERT INTO instrument_detail 
          SET instrument = ?,
              instrument_type = ?,
              contract_type = ?,
              contract_value = ?,
              max_leverage = ?,
              min_size = ?,
              lot_size = ?,
              tick_size = ?,
              max_limit_size = ?,
              max_market_size = ?,
              list_time = FROM_UNIXTIME(?/1000),
              expiry_time = FROM_UNIXTIME(?/1000)`,
      [
        instrument,
        instrumentType,
        contractType,
        api.contractValue,
        api.maxLeverage,
        api.minSize,
        api.lotSize,
        api.tickSize,
        api.maxLimitSize,
        api.maxMarketSize,
        api.listTime,
        api.expireTime,
      ]
    );
  }
  return key;
}

//+--------------------------------------------------------------------------------------+
//| Performs a lookup on instrument_detail; returns key if instrument detail exists      |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["instrument"] | undefined> {
  const args = [];

  let sql: string = `SELECT instrument FROM instrument_detail WHERE instrument = ?`;

  if (props.instrument) {
    args.push(hex(props.instrument, 3));
  } else return undefined;

  const [key] = await Select<IInstrumentDetail>(sql, args);
  return key === undefined ? undefined : key.instrument;
}

//+--------------------------------------------------------------------------------------+
//| Updates instrument detail on all identified changes                                  |
//+--------------------------------------------------------------------------------------+
export async function Update(updates: Array<IInstrumentAPI & IKeyProps>) {
  for (const update of updates) {
    const contractType = await ContractType.Key({ source_ref: update.contractType });
    const instrumentType = await InstrumentType.Key({ source_ref: update.instType });

    if (update.instrument) {
      await Modify(
        `UPDATE instrument_detail 
            SET instrument_type = ?,
                contract_type = ?,
                contract_value = ?,
                max_leverage = ?,
                min_size = ?,
                lot_size = ?,
                tick_size = ?,
                max_limit_size = ?,
                max_market_size = ?,
                list_time = FROM_UNIXTIME(?/1000),
                expiry_time = FROM_UNIXTIME(?/1000)
          WHERE instrument = ?`,
        [
          instrumentType,
          contractType,
          update.contractValue,
          update.maxLeverage,
          update.minSize,
          update.lotSize,
          update.tickSize,
          update.maxLimitSize,
          update.maxMarketSize,
          update.listTime,
          update.expireTime,
          update.instrument,
        ]
      );
    }
  }
}
