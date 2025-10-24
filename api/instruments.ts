//+--------------------------------------------------------------------------------------+
//|                                                                [api]  instruments.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { splitSymbol } from "lib/app.util";
import { isEqual } from "lib/std.util";

import * as Currency from "db/interfaces/currency";
import * as Instrument from "db/interfaces/instrument";
import * as InstrumentDetail from "db/interfaces/instrument_detail";
import * as InstrumentPeriod from "db/interfaces/instrument_period";

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
const publish = async (props: Array<IInstrumentAPI>) => {
  console.log("-> Instrument:Publish [API]");

  const published: Array<Instrument.IInstrument["instrument"]> = [];
  const modified: Array<Instrument.IInstrument["instrument"]> = [];

  for (const api of props) {
    const instrument = await Instrument.Publish({ symbol: api.instId });

    if (instrument) {
      const instrument_detail = await InstrumentDetail.Publish({
        instrument,
        instrument_type: api.instType,
        contract_type: api.contractType,
        contract_value: parseFloat(api.contractValue),
        max_leverage: parseInt(api.maxLeverage),
        min_size: parseFloat(api.minSize),
        lot_size: parseFloat(api.lotSize),
        tick_size: parseFloat(api.tickSize),
        max_limit_size: parseFloat(api.maxLimitSize),
        max_market_size: parseFloat(api.maxMarketSize),
        list_time: new Date(parseInt(api.listTime)),
        expiry_time: new Date(parseInt(api.expireTime)),
      });

      published.push(instrument);
      instrument_detail && modified.push(instrument);
    }
  }

  const suspense = await Instrument.Suspense(published);
  await InstrumentPeriod.Import();

  suspense && console.log("   # Instruments:Suspended: ", suspense.length, { suspense });
  modified.length && console.log("   # Instruments Updated: ", modified.length, "modified");
};

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
    } else throw new Error(`-> [Error] Instruments.Import: Bad response from instrument fetch: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`-> [Error] Instruments.Import: Error fetching instruments;`, error);
  }
};
