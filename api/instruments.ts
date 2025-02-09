import { SplitSymbol } from "@/components/std.util";
import * as instrument from "@/db/interfaces/instrument";
import * as currency from '@/db/interfaces/currency';

export interface IInstrumentAPI {
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
    data: IInstrumentAPI[];
};

export function Publish(Instruments: IInstrumentAPI[]) {
  Instruments.forEach(async (item) => {
      const symbol: string[] = SplitSymbol(item.instId);
      const base  = await currency.Publish(symbol[0],item.state !== 'live');
      const quote = await currency.Publish(symbol[1],false);
      console.log("Published", [base, quote]);
      const parent = await instrument.Publish(base,quote);
  }
)};

export function Import() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
    .then(response => response.json())
    .then((result: IResult) => Publish(result.data))
 
};
