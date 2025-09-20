//+--------------------------------------------------------------------------------------+
//|                                                                [api]  instruments.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { splitSymbol } from "@lib/app.util";
import { isEqual } from "@lib/std.util";

import * as Currency from "@db/interfaces/currency";
import * as Instrument from "@db/interfaces/instrument";
import * as InstrumentDetail from "@db/interfaces/instrument_detail";
import * as InstrumentPeriod from "@db/interfaces/instrument_period";

export interface IInstrumentAPI {
  instId: string;
  baseCurrency: string;
  quoteCurrency: string;
  contractValue: string;
  listTime: string;
  expireTime: string;
  maxLeverage: string;
  minSize: string;
  lotSize: string;
  tickSize: string;
  instType: string;
  contractType: string;
  maxLimitSize: string;
  maxMarketSize: string;
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
const publish = async (api: Array<IInstrumentAPI>) => {
  console.log("-> Instrument:Publish [API]");

  const processed: Array<Instrument.IInstrument["instrument"]>= [];
  const errors = [];

  for (const props of api) {
    const [base_symbol, quote_symbol] = splitSymbol(props.instId);
    const base_currency = await Currency.Publish({ symbol: base_symbol, suspense: props.state !== "live" });
    const quote_currency = await Currency.Publish({ symbol: quote_symbol, suspense: false });
    const key = await Instrument.Key({ symbol: props.instId });
    const instrument = await Instrument.Publish({
      instrument: key,
      symbol: props.instId,
      base_symbol,
      base_currency,
      quote_symbol,
      quote_currency,
    });
    const instrument_detail = await InstrumentDetail.Publish({
      instrument: key || instrument,
      instrument_type: props.instType,
      contract_type: props.contractType,
      contract_value: parseFloat(props.contractValue),
      max_leverage: parseInt(props.maxLeverage),
      min_size: parseFloat(props.minSize),
      lot_size: parseFloat(props.lotSize),
      tick_size: parseFloat(props.tickSize),
      max_limit_size: parseFloat(props.maxLimitSize),
      max_market_size: parseFloat(props.maxMarketSize),
      list_time: new Date(parseInt(props.listTime)),
      expiry_time: new Date(parseInt(props.expireTime)),
    });
    instrument && isEqual(instrument, instrument_detail!) ? processed.push(instrument) : errors.push(props.instId);
  }
  await Instrument.Audit(processed);
  await InstrumentPeriod.Import();
};

// suspense.length && console.log("   # Instruments:Suspended: ", suspense.length, { suspense });
// modified.length && console.log("   # Instruments Updated: ", modified.length, { modified });

// await Currency.Suspend(suspense);
// await Instrument.Suspend(suspense);
// await InstrumentDetail.Update(modified);

//+--------------------------------------------------------------------------------------+
//| Import - Retrieve api Instrument, pass to publisher                                  |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Instruments.Import [API]:", new Date().toLocaleString());

  try {
    const response = await fetch(`https://openapi.blofin.com/api/v1/market/instruments`);

    if (response.ok) {
      const json = await response.json();
      const result: IResult = json;

      await publish(result.data);
    }
  } catch (error) {
    console.log(`Error fetching instruments;`, error);
  }
};
