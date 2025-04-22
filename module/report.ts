import { isBetween, isEqual, isHigher, isLower, fileWrite, format } from "@lib/std.util";
import type {IPrice, IPoint, IFractalEvent} from "@module/fractal"

interface IReport {
  bar: IPrice;
  sma: { open: number; close: number };
  fractal: IPoint;
  breakout: IPoint;
  extension: Array<IFractalEvent>;
  retracement: Array<IFractalEvent>;
}

const log: Array<IReport> = [];
const empty: IReport = {
  bar: {
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
  breakout: {
    timestamp: 0,
    price: 0,
  },
  extension: [],
  retracement: [],
};
const report: IReport = structuredClone(empty);
const updateReport = () => {
  log.push({
    bar: { timestamp: report.bar.timestamp, open: report.bar.open, high: report.bar.high, low: report.bar.low, close: report.bar.close },
    sma: { open: report.sma.open, close: report.sma.close },
    fractal: { timestamp: report.fractal.timestamp, price: report.fractal.price },
    breakout: { timestamp: report.fractal.timestamp, price: report.fractal.price },
    extension: report.extension,
    retracement: report.retracement,
  });
  Object.assign(report, { ...empty });
  report.extension.length = 0;
  report.retracement.length = 0;
};
const publishReport = () => {
  //-- format csv line
  const array: Array<any> = [];
  log.map((log) => {
    const line: Array<number | string> = [
      log.bar.timestamp,
      log.bar.open,
      log.bar.high,
      log.bar.low,
      log.bar.close,
      log.sma.open,
      log.sma.close,
      log.fractal.timestamp ? log.fractal.timestamp : "=na()",
      log.fractal.price ? log.fractal.price : "=na()",
    ];
    const ext: Array<number | string> = log.extension.map((log) => (log.timestamp ? log.price : "=na()"));
    const ret: Array<number | string> = log.retracement.map((log) => (log.timestamp ? log.price : "=na()"));
    array.push(line.concat(ext, ret));
  });

  //-- write report
  fileWrite("ctest-reverse.log", array);
};
