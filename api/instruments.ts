//+------------------------------------------------------------------+
//|                                                   instruments.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { SplitSymbol } from "@/lib/std.util";

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
  data: IInstrumentAPI[];
}

//+------------------------------------------------------------------+
//| Publish - Updates Instruments, related elements stored locally   |
//+------------------------------------------------------------------+
export function Publish(apiInstruments: IInstrumentAPI[]) {
  apiInstruments.forEach(async (apiInstrument) => {
    const symbol: string[] = SplitSymbol(apiInstrument.instId);
    const baseCurrency = await Currency.Publish(symbol[0], apiInstrument.state !== "live");
    const quoteCurrency = await Currency.Publish(symbol[1], false);
    const contractType = await ContractType.Publish(apiInstrument.contractType);
    const instrumentType = await InstrumentType.Publish(apiInstrument.instType);
    const instrument = await Instrument.Publish(baseCurrency, quoteCurrency);

    await InstrumentDetail.Publish(instrument, instrumentType, contractType, apiInstrument);

    console.log("Published", symbol);
  });

  InstrumentPeriod.Publish();
}

//+------------------------------------------------------------------+
//| Import - Retrieve api Instrument, pass to publisher              |
//+------------------------------------------------------------------+
export function Import() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
    .then((response) => response.json())
    .then((result: IResult) => Publish(result.data));
}
