//+--------------------------------------------------------------------------------------+
//|                                                                       instruments.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { isEqual, splitSymbol } from "@/lib/std.util";

import * as Instrument from "@db/interfaces/instrument";
import * as Currency from "@db/interfaces/currency";
import * as ContractType from "@db/interfaces/contract_type";
import * as InstrumentType from "@db/interfaces/instrument_type";
import * as InstrumentDetail from "@db/interfaces/instrument_detail";
import * as InstrumentPeriod from "@db/interfaces/instrument_period";

export interface IInstrumentAPI {
  instId: string;
  baseCurrency: string;
  quoteCurrency: string;
  contractValue: number;
  listTime: number;
  expireTime: number;
  maxLeverage: number;
  minSize: number;
  lotSize: number;
  tickSize: number;
  instType: string;
  contractType: string;
  maxLimitSize: number;
  maxMarketSize: number;
  state: string;
}

export interface IResult {
  code: string;
  msg: string;
  data: Array<IInstrumentAPI>;
}

//+--------------------------------------------------------------------------------------+
//| Publish - Creates new instruments; populates periods on new Blofin receipts          |
//+--------------------------------------------------------------------------------------+
export async function Publish(apiInstrument: Array<IInstrumentAPI>): Promise<Array<IInstrumentAPI>> {
  for (const api of apiInstrument) {
    const symbol: string[] = splitSymbol(api.instId);
    const baseCurrency = await Currency.Publish(symbol[0], api.state !== "live");
    const quoteCurrency = await Currency.Publish(symbol[1], false);
    const contractType = await ContractType.Publish(api.contractType);
    const instrumentType = await InstrumentType.Publish(api.instType);
    const instrument = await Instrument.Publish(baseCurrency, quoteCurrency);

    await InstrumentDetail.Publish(instrument, instrumentType, contractType, api);

    //console.log("Published", symbol);
  }
  return apiInstrument;
}

//+--------------------------------------------------------------------------------------+
//| Process - Compares Instruments/details stored locally w/Blofin json; applies diffs   |
//+--------------------------------------------------------------------------------------+
export async function Process(apiInstruments: Array<IInstrumentAPI>) {
  const instruments: Array<Partial<Instrument.IInstrument>> = await Instrument.FetchAll();
  const modified: Array<IInstrumentAPI> = [];
  const suspense: Array<Currency.IKeyProps> = [];

  const db: Array<Partial<Instrument.IInstrument>> = instruments.sort((a, b) => {
    return a.currency_pair! < b.currency_pair! ? -1 : a.currency_pair! > b.currency_pair! ? 1 : 0;
  });
  const api: Array<IInstrumentAPI> = apiInstruments.sort((a, b) => {
    return a.instId < b.instId ? -1 : a.instId > b.instId ? 1 : 0;
  });

  if (db.length >= api.length) {
    let instrument = 0;

    db.forEach((local) => {
      if (local.currency_pair === api[instrument].instId) {
        let updated: boolean = false;

        !isEqual(local.contract_value!, api[instrument].contractValue) && (updated = true);
        !isEqual(local.list_timestamp!, api[instrument].listTime / 1000) && (updated = true);
        !isEqual(local.expiry_timestamp!, api[instrument].expireTime / 1000) && (updated = true);
        !isEqual(local.max_leverage!, api[instrument].maxLeverage) && (updated = true);
        !isEqual(local.min_size!, api[instrument].minSize) && (updated = true);
        !isEqual(local.lot_size!, api[instrument].lotSize) && (updated = true);
        !isEqual(local.tick_size!, api[instrument].tickSize) && (updated = true);
        !isEqual(local.max_limit_size!, api[instrument].maxLimitSize) && (updated = true);
        !isEqual(local.max_market_size!, api[instrument].maxMarketSize) && (updated = true);

        local.instrument_type !== api[instrument].instType && (updated = true);
        local.contract_type !== api[instrument].contractType && (updated = true);
        local.suspense === (api[instrument].state === "live") && (updated = true);

        if (updated) {
          const update = Object.assign({}, { instrument: local.instrument! }, api[instrument]);
          modified.push(update);
        }

        instrument++;
      } else if (local.currency_pair! <= api[instrument].instId) {
        !local.suspense && suspense.push({ currency: local.base_currency!, symbol: local.base_symbol! });
      }
    });
  }
  console.log("Instruments Suspended: ", suspense.length, suspense);
  console.log("Instruments Updated: ", modified.length, modified);

  await Currency.Suspend(suspense);
  await Instrument.Suspend(suspense);
  await InstrumentDetail.Update(modified);

  InstrumentPeriod.Publish();
}

//+--------------------------------------------------------------------------------------+
//| Import - Retrieve api Instrument, pass to publisher                                  |
//+--------------------------------------------------------------------------------------+
export function Import() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
    .then((response) => response.json())
    .then(async (result: IResult) => await Publish(result.data))
    .then(async (data: Array<IInstrumentAPI>) => await Process(data));
}
