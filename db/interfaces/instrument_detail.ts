//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_detail.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { IInstrumentAPI } from "@api/instruments";

import { Modify, Select } from "@db/query.utils";

import * as Instrument from "@db/interfaces/instrument";
import * as ContractType from "@db/interfaces/contract_type";
import * as InstrumentType from "@db/interfaces/instrument_type";

export interface IKeyProps {
  instrument?: Uint8Array;
}

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

//+--------------------------------------------------------------------------------------+
//| Inserts Instrument Details on receipt of a new Instrument from Blofin; returns key;  |
//+--------------------------------------------------------------------------------------+
export async function Publish(
  instrument: Uint8Array,
  instrument_type: Uint8Array,
  contract_type: Uint8Array,
  api: IInstrumentAPI
): Promise<IKeyProps["instrument"] | undefined> {
  const key = await Instrument.Key({ instrument });
  const confirm = await Key({ instrument });

  if (key === undefined) return key;
  if (confirm === undefined) {
    const contractValue = parseFloat(api.contractValue);
    const maxLeverage = parseInt(api.maxLeverage);
    const minSize = parseFloat(api.minSize);
    const lotSize = parseFloat(api.lotSize);
    const tickSize = parseFloat(api.tickSize);
    const maxLimitSize = parseFloat(api.maxLimitSize);
    const maxMarketSize = parseFloat(api.maxMarketSize);
    const listTime = parseInt(api.listTime);
    const expireTime = parseInt(api.expireTime);

    await Modify(
      `INSERT INTO blofin.instrument_detail 
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
        instrument_type,
        contract_type,
        contractValue,
        maxLeverage,
        minSize,
        lotSize,
        tickSize,
        maxLimitSize,
        maxMarketSize,
        listTime,
        expireTime,
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

  let sql: string = `SELECT instrument FROM blofin.instrument_detail WHERE instrument = ?`;

  if (props.instrument) {
    args.push(props.instrument);
  } else return undefined;

  const [key] = await Select<IInstrumentDetail>(sql, args);
  return key === undefined ? undefined : key.instrument;
}

//+--------------------------------------------------------------------------------------+
//| Updates instrument detail on all identified changes                                  |
//+--------------------------------------------------------------------------------------+
export async function Update(updates: Array<IInstrumentAPI & IKeyProps>) {
  for (const update of updates) {
    const instrument = update.instrument;
    const contract_type = await ContractType.Key({ source_ref: update.contractType });
    const instrument_type = await InstrumentType.Key({ source_ref: update.instType });
    const contractValue = parseFloat(update.contractValue);
    const maxLeverage = parseInt(update.maxLeverage);
    const minSize = parseFloat(update.minSize);
    const lotSize = parseFloat(update.lotSize);
    const tickSize = parseFloat(update.tickSize);
    const maxLimitSize = parseFloat(update.maxLimitSize);
    const maxMarketSize = parseFloat(update.maxMarketSize);
    const listTime = parseInt(update.listTime);
    const expireTime = parseInt(update.expireTime);

    if (update.instrument) {
      await Modify(
        `UPDATE blofin.instrument_detail 
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
          instrument_type,
          contract_type,
          contractValue,
          maxLeverage,
          minSize,
          lotSize,
          tickSize,
          maxLimitSize,
          maxMarketSize,
          listTime,
          expireTime,
          instrument,
        ]
      );
    }
  }
}
