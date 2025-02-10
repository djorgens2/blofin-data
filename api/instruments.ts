import { SplitSymbol } from "../components/std.util";

import * as Instrument from "../db/interfaces/instrument";
import * as Currency from "../db/interfaces/currency";
import * as ContractType from "../db/interfaces/contract_type";
import * as InstrumentType from "../db/interfaces/instrument_type";
import * as InstrumentDetail from "../db/interfaces/instrument_detail";

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

export function Publish(Instruments: IInstrumentAPI[]) {
  Instruments.forEach(async (item) => {
    const symbol: string[] = SplitSymbol(item.instId);

    const base = await Currency.Publish(symbol[0], item.state !== "live");
    const quote = await Currency.Publish(symbol[1], false);
    const contract = await ContractType.Publish(item.contractType);
    const inst_type = await InstrumentType.Publish(item.instType);
    const instrument = await Instrument.Publish(base, quote);
    const detail = await InstrumentDetail.Publish(
      instrument,
      inst_type,
      contract,
      item.contractValue,
      item.maxLeverage,
      item.minSize,
      item.lotSize,
      item.tickSize,
      item.maxLimitSize,
      item.maxMarketSize,
      item.listTime,
      item.expireTime
    );

    console.log("Published", symbol);
  });
}

export function Import() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
    .then((response) => response.json())
    .then((result: IResult) => Publish(result.data));
}
