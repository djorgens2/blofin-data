//+------------------------------------------------------------------+
//|                                                       candles.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import type { IInstrumentPeriod } from "@/db/interfaces/instrument_period"; 

import * as InstrumentPeriod from "@db/interfaces/instrument_period";
import * as Candle from "@db/interfaces/candle";

export interface ICandleAPI {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  volCurrency: number;
  volCurrencyQuote: number;
  confirm: boolean;
}

export interface IResult {
  code: string;
  msg: string;
  data: string[][];
}

//+------------------------------------------------------------------+
//| Publish - Refresh candle data by instrument stored locally       |
//+------------------------------------------------------------------+
export function Publish(instrument: Partial<IInstrumentPeriod>, apiCandles: ICandleAPI[]) {
  apiCandles.forEach(async (apiCandle) => {
    await Candle.Publish(instrument, apiCandle);
  });
}

//+------------------------------------------------------------------+
//| Import - Retrieve api Candle, format, pass to publisher          |
//+------------------------------------------------------------------+
export async function Import() {
  const instruments = await InstrumentPeriod.FetchActive();
  instruments.forEach((instrument) => {
    fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${instrument.currency_pair}&limit=${instrument.data_collection_rate}&bar=${instrument.timeframe}`)
      .then((response) => response.json())
      .then((result: IResult) => {
        const apiCandles: ICandleAPI[] = result.data.map((field: string[]) => ({
          ts: parseInt(field[0]),
          open: parseFloat(field[1]),
          high: parseFloat(field[2]),
          low: parseFloat(field[3]),
          close: parseFloat(field[4]),
          vol: parseInt(field[5]),
          volCurrency: parseInt(field[6]),
          volCurrencyQuote: parseInt(field[7]),
          confirm: Boolean(field[8]),
        }));

        Publish(instrument, apiCandles);
      });
  });
}
