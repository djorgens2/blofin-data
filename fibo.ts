import { Event, CEvent } from "@module/event";
import { format } from "@/lib/std.util";

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
const ev = CEvent();
const fibonacci: Array<IFibonacciLevel> = [
  { level: 0, percent: 0 },
  { level: 1, percent: 0.236 },
  { level: 2, percent: 0.382 },
  { level: 3, percent: 0.5 },
  { level: 4, percent: 0.618 },
  { level: 5, percent: 0.764 },
  { level: 6, percent: 1 },
  { level: 7, percent: 1.618 },
  { level: 8, percent: 2.618 },
  { level: 9, percent: 3.618 },
  { level: 10, percent: 4.236 },
  { level: 11, percent: 8.236 },
];

const fibonacciLevel = (percent: number): IFibonacciLevel => {
  const level: IFibonacciLevel = { level: 0, percent: 0 };
  fibonacci
    .slice()
    .reverse()
    .some((seek) => {
      if (format(percent, 3) >= format(seek.percent, 3)) {
        Object.assign(level, seek);
        return true;
      }
    });
  return level;
};

const fibonacciPrice = (root: number, expansion: number, percent: number): number => {
  return format((expansion - root) * percent + root, 5);
};

const bar: IPrice = { timestamp: 1738016100, open: 3.0431, high: 3.0171, low: 2.9996, close: 3.0106 };
// 1738017000	3.0105	3.0252	3.0082	3.0249	3.01105	3.01775	#N/A	#N/A	1738016100	2.9996

const expansion: number = 9;
const event: IFractalEvent = {
  timestamp: 1738016100,
  price: 2.9996,
  level: 6,
  percent: 1,
  event: Event.NewReversal,
};
while (expansion > event.level++) {
  console.log(event.timestamp, fibonacciPrice(bar.open, bar.low, fibonacci[event.level].percent), fibonacci[event.level], ev.eventText(Event.NewExtension));
}
