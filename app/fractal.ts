import { ICompare, IsHigher } from "../components/std.util";
import { ICandle, Fetch } from "../db/interfaces/candle";
import { IInstrumentPair } from "../db/interfaces/instrument";

enum FractalPoint {
  Origin,
  Base,
  Root,
  Expansion,
  Retrace,
  Recovery,
  Close
};

interface IFractal {
  time: number;
  smaOpen: number;
  smaClose: number;
  fractalPoint: number[];
};

function updateFractal(Price:ICompare) {/*console.log(Price)*/};

export async function CalculateFractal(pair: Partial<IInstrumentPair>) {
  const candles: Partial<ICandle>[] = await Fetch(
    pair.instrument!,
    pair.period!
  );

  const fractal: IFractal[] = [
    {
      time: candles[0].bar_time!,
      smaOpen: 0,
      smaClose: 0,
      fractalPoint: [0,0,0,0,0,0,0]
    },
  ];

  const sma: number = pair.sma_factor!;

  let smaOpen: number;
  let smaClose: number;
  let high: ICompare = {Value: 0, Precision: 6, Update: true};
  let low: ICompare = {Value: 0, Precision: 6, Update: true};

  candles.forEach((item, row) => {
    if (row === 0) {
        //-- Initialize
        smaOpen = item.open!,
        smaClose = item.close!,
        high.Value = item.high!,
        low.Value = item.low!

    } else {
      //-- Aggregate
      smaOpen += item.open!;
      smaClose += item.close!;

      if (IsHigher( item.high!, high ))
        updateFractal(high);

      //-- Set SMA base
      if (row >= sma) {
        smaOpen -= candles[row-sma].open!;
        smaClose -= candles[row-sma].close!;
      }
  }
//  if (row+1>=sma)
//    console.log(row, [smaOpen, smaClose], [smaOpen/sma, smaClose/sma]);
  });
}
