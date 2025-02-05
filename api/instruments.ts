import * as instrument from "../db/interfaces/instrument";
import * as currency from './currency';

export interface IInstrument {
    instId: string;
    baseCurrency: string;
    quoteCurrency: string;
    contractValue: number;
    listTime: number;
    expireTime: number;
    maxLeverage: number;
    minSize: number;
    lotSize : number;
    tickSize: number;
    instType: string;
    contractType: string;
    maxLimitSize: number;
    maxMarketSize: number;
    state: string;
  };

export interface IResult {
    code: string;
    msg: string;
    data: IInstrument[];
};

export function Publish(Instruments: IInstrument[]) {
  if (Instruments.length === 0) return;

  Instruments.forEach((instrument) => {
    const symbol: string[] = instrument.instId.split("-");

    if (symbol[0]===instrument.baseCurrency&&symbol[1]===instrument.quoteCurrency)
    { 
      currency.Publish(instrument.baseCurrency);
      currency.Publish(instrument.quoteCurrency);
    }
  });
};

export function Import() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments?instId=BTC-USDT`)
    .then(response => response.json())
    .then((result: IResult) => Publish(result.data))

  
};
