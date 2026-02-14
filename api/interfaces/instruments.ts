//+--------------------------------------------------------------------------------------+
//|                                                                [api]  instruments.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "db/query.utils";
import type { IInstrument } from "db/interfaces/instrument";
import type { ICurrency } from "db/interfaces/currency";

import { Session } from "module/session";
import { Summary } from "db/query.utils";

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

//+--------------------------------------------------------------------------------------+
//| Publish - Creates new instruments; populates periods on new Blofin receipts          |
//+--------------------------------------------------------------------------------------+
const publish = async (props: Array<IInstrumentAPI>) => {
  console.log("-> Instrument.Publish [API]");

  const imports = props.map(async (api) => {
    const master = await Instrument.Publish({ symbol: api.instId });
    if (master.response.success) {
      const detail = await InstrumentDetail.Publish({
        instrument: master.key?.instrument,
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
      return detail as IPublishResult<IInstrument>;
    } else return master as IPublishResult<IInstrument>;
  });

  const published: Array<IPublishResult<IInstrument>> = await Promise.all(imports);
  const suspended: Array<IPublishResult<ICurrency>> = await Instrument.Suspense(
    props.map((i) => ({ symbol: i.instId, status: i.state === "live" ? "Enabled" : "Suspended" }))
  );

  await InstrumentPeriod.Import();

  return Summary(published.map((p) => p?.response).concat(suspended.map((s) => s?.response)));
};

//+--------------------------------------------------------------------------------------+
//| Fetches instruments specific to the account (demo/production)                        |
//+--------------------------------------------------------------------------------------+
export const Fetch = async () => {
  console.log("-> Instruments.Fetch [API]:", new Date().toLocaleString());

  try {
    const response = await fetch(`${Session().rest_api_url}/api/v1/market/instruments`);

    if (response.ok) {
      const result = await response.json();
      const json = result.data as Array<IInstrumentAPI>;
      if (result.code === "0") {
        return json;
      }
      console.log(
        `-> [Error] Instrument.Fetch: failed to retrieve instruments; error returned:`,
        result.code || -1,
        result.msg ? `response: `.concat(result.msg) : ``
      );
    } else throw new Error(`-> [Error] Instruments.Import: Bad response from instrument fetch: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`-> [Error] Instruments.Import: Error fetching instruments;`, error);
  }
};

//+--------------------------------------------------------------------------------------+
//| Import - Retrieve api Instrument, pass to publisher                                  |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Instruments.Import [API]:", new Date().toLocaleString());

  try {
    const response = await fetch(`https://openapi.blofin.com/api/v1/market/instruments`);

    if (response.ok) {
      const result = await response.json();
      const json = result.data as Array<IInstrumentAPI>;
      if (result.code === "0") {
        return await publish(json);
      }
      console.log(
        `-> [Error] Instrument.Import: failed to retrieve instruments; error returned:`,
        result.code || -1,
        result.msg ? `response: `.concat(result.msg) : ``
      );
    } else throw new Error(`-> [Error] Instruments.Import: Bad response from instrument fetch: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`-> [Error] Instruments.Import: Error fetching instruments;`, error);
  }
};
