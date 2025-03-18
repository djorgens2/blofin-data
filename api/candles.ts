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
export function Publish(instrument: Uint8Array, period: Uint8Array, apiCandles: Array<ICandleAPI>) {
  apiCandles.forEach(async (apiCandle) => {
    await Candle.Publish(instrument, period, apiCandle);
  });
}

//+------------------------------------------------------------------+
//| Import - Retrieve api Candle, format, pass to publisher          |
//+------------------------------------------------------------------+
export async function BulkImport() {
  const instruments = await InstrumentPeriod.FetchActive();
  instruments.forEach((instrument) => {
    fetch(
      `https://openapi.blofin.com/api/v1/market/candles?instId=${instrument.currency_pair!}&limit=${instrument.bulk_collection_rate!}&bar=${instrument.timeframe}`
    )
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
          confirm: parseInt(field[8]) === 1,
        }));

        Publish(instrument.instrument!, instrument.period!, apiCandles);
      });
  });
}

//+------------------------------------------------------------------+
//| Import - Retrieve api Candle, format, pass to publisher          |
//+------------------------------------------------------------------+
export function IntervalImport(instrument: IInstrumentPeriod, interval: number) {
  console.log(instrument.currency_pair, ["Interval", interval]);
  fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${instrument.currency_pair!}&limit=${interval}&bar=${instrument.timeframe!}`)
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
        confirm: parseInt(field[8]) === 1,
      }));

      Publish(instrument.instrument, instrument.period, apiCandles);
    });
}
