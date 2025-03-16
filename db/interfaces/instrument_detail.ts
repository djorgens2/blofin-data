//+------------------------------------------------------------------+
//|                                             instrument_detail.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { IInstrumentAPI } from "@/api/instruments";

import { Modify } from "@db/query.utils";
import { RowDataPacket } from "mysql2";

export interface IInstrumentDetail extends RowDataPacket {
  instrument: number;
  instrument_type: number;
  contract_type: number;
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

export async function Publish(instrument: number, instrumentType: number, contractType: number, apiInstrument: Partial<IInstrumentAPI>): Promise<number> {
  console.log(instrument)
  const set = await Modify(
    `REPLACE INTO instrument_detail SET instrument = ?, instrument_type = ?, contract_type = ?, contract_value = ?, max_leverage = ?, min_size = ?, lot_size = ?,
        tick_size = ?, max_limit_size = ?, max_market_size = ?, list_time = FROM_UNIXTIME(?/1000), expiry_time = FROM_UNIXTIME(?/1000)`,
    [
      instrument,
      instrumentType,
      contractType,
      apiInstrument.contractValue,
      apiInstrument.maxLeverage,
      apiInstrument.minSize,
      apiInstrument.lotSize,
      apiInstrument.tickSize,
      apiInstrument.maxLimitSize,
      apiInstrument.maxMarketSize,
      apiInstrument.listTime,
      apiInstrument.expireTime,
    ]
  );

  return set.insertId;
}
