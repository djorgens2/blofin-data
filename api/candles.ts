import * as Instrument from "../db/interfaces/instrument";
import * as Candle from "../db/interfaces/candle"

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

export function Publish(
  Pair: Instrument.IInstrumentPair,
  Candles: ICandleAPI[]
) {
  Candles.forEach(async (item) => await Candle.Publish(
      Pair.instrument,
      Pair.period_type,
      item.ts,
      item.open,
      item.high,
      item.low,
      item.close,
      item.vol,
      item.volCurrency,
      item.volCurrencyQuote,
      item.confirm
  ));
  console.log(Candles);
}

export async function Import() {
  const pair = await Instrument.Fetch();
  
  pair.forEach((item) => {
    fetch(
      `https://openapi.blofin.com/api/v1/market/candles?instId=${item.pair}&limit=10&bar=${item.period}`
    )
      .then((response) => response.json())
      .then((result: IResult) => {
        const candles: ICandleAPI[] = result.data.map((field: string[]) => ({
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
  
        /*@ts-ignore*/
        Publish(item, candles);
      });      
  });
}
