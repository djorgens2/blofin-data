//import * as currency from "./currency";

export interface ICandle {
    ts: number;
    open: number;
    high: number;
    low: number;
    close: number;
    vol: number;
    volCurrency: number;
    volCurrencyQuote : number;
    confirm: boolean;
  };

export interface IResult {
    code: string;
    msg: string;
    data: string[][];
};

export function Publish(Instrument: string, Period: string, Candles: ICandle[]) {
  if (Candles.length === 0) return;

  const instrument: string[] = Instrument.split("-");
  
  // instrument.forEach((symbol) => currency.Publish(symbol));
// console.log(currency);
//  console.log(instrument);
//  console.log(Period);
  console.log(Candles);
//  console.log(Candle.length);
};

export function Import(Instrument: string, Period: string) {
  fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${Instrument}&limit=10&bars=${Period}`)
    .then(response => response.json())
    .then((result: IResult) => {
        const candles: ICandle[] = result.data.map((field: string[]) => ({
            ts: parseInt(field[0]),
            open: parseFloat(field[1]),
            high: parseFloat(field[2]),
            low: parseFloat(field[3]),
            close: parseFloat(field[4]),
            vol: parseInt(field[5]),
            volCurrency: parseInt(field[6]),
            volCurrencyQuote: parseInt(field[7]),
            confirm: Boolean(field[8])
        }))

        Publish(Instrument, Period, candles);
    })
};
