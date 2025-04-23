import { Event } from "@module/event";
import { fileWrite } from "@lib/std.util";

interface IPrice {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IPoint {
  timestamp: number;
  price: number;
}

interface IFractalEvent extends IFibonacciLevel, IPoint {
  event: Event;
}

interface IFibonacciLevel {
  level: number;
  percent: number;
}

interface IReport {
  ohlc: IPrice;
  sma: { open: number; close: number };
  fractal: IPoint;
  extension: Array<IFractalEvent>;
  retracement: Array<IFractalEvent>;
}

const reportLog: Array<IReport> = [];
const newEdition: IReport = {
  ohlc: {
    timestamp: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
  },
  sma: {
    open: 0,
    close: 0,
  },
  fractal: {
    timestamp: 0,
    price: 0,
  },
  extension: [],
  retracement: [],
};
const report = structuredClone(newEdition);
const updateReport = () => {
  reportLog.push(report);
};
const publishReport = () => {
  //-- format csv line
  const array: Array<any> = [];
  reportLog.map((log) => {
    const line: Array<number | string> = [
      log.ohlc.timestamp,
      log.ohlc.open,
      log.ohlc.high,
      log.ohlc.low,
      log.ohlc.close,
      log.sma.open,
      log.sma.close,
      log.fractal.timestamp,
      log.fractal.price,
    ];
    const ext: Array<number[] | string[]> = log.extension.map((log) => (log.timestamp ? [log.percent, log.price] : ["=na()","=na()"]));
    const ret: Array<number[] | string[]> = log.retracement.map((log) => (log.timestamp ? [log.percent, log.price] : ["=na()","=na()"]));
    /*@ts-ignore */
    array.push(line.concat(ext, ret));
  });

  //-- write report
  fileWrite("ctest-reverse.log", array);

  //-- clear for next edition
  Object.assign(report, newEdition);
};

Object.assign(report, {
  ohlc: { timestamp: 1738017000, open: 3.0105, high: 3.0252, low: 3.0082, close: 3.0249 },
  sma: { open: 3.01105, close: 3.01775 },
  fractal: { timestamp: 1738016100, price: 2.9996 },
  extension: [
    { timestamp: 1738017000, price: 3.0171, level: 6, percent: 1, event: Event.NewReversal },
    { timestamp: 1738017000, price: 3.0451, level: 7, percent: 1.618, event: Event.NewExtension },
    { timestamp: 1738017000, price: 3.0901, level: 8, percent: 2.618, event: Event.NewExtension },
    { timestamp: 0, price: 0, level: 9, percent: 3.618, event: Event.NoEvent },
    { timestamp: 0, price: 0, level: 10, percent: 4.236, event: Event.NoEvent },
    { timestamp: 0, price: 0, level: 11, percent: 8.236, event: Event.NoEvent },
  ],
  retracement: [
    { timestamp: 1738017000, price: 2.9996, level: 0, percent: 0, event: Event.NewReversal },
    { timestamp: 0, price: 0, level: 1, percent: 0.236, event: Event.NoEvent },
    { timestamp: 0, price: 0, level: 2, percent: 0.382, event: Event.NoEvent },
    { timestamp: 0, price: 0, level: 3, percent: 0.5, event: Event.NoEvent },
    { timestamp: 0, price: 0, level: 4, percent: 0.618, event: Event.NoEvent },
    { timestamp: 0, price: 0, level: 5, percent: 0.764, event: Event.NoEvent },
  ],
});
updateReport();
publishReport();

//publishReport();
