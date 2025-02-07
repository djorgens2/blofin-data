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

  Instruments.forEach(async (instrument) => {
    const symbol: string[] = instrument.instId.split("-");

    if (symbol[0]===instrument.baseCurrency&&symbol[1]===instrument.quoteCurrency)
    {
      const quote: number = await currency.Publish(instrument.quoteCurrency, false);
      const base:  number = await currency.Publish(instrument.baseCurrency, instrument.state !== 'live');

      console.log(quote);
      console.log(base);
    }


  });
};

export function Import() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
    .then(response => response.json())
    .then((result: IResult) => Publish(result.data))
 
};
