//----------------------------------- KeySet tests ------------------------------------------//
// import { KeySet, IKeyProps } from "./db/interfaces/keyset";

// async function getKeys<T extends IKeyProps>(props: T)  {
// const keyset: IKeyProps = await KeySet(props);
//   console.log(keyset);
// }

// getKeys({symbol: "XRP-USDT"});

//----------------------------------- Instrument diffs ------------------------------------------//
//   local.instrument_type !== api[instrument].instType && console.log(local.instrument_type !== api[instrument].instType);
//   local.contract_type !== api[instrument].contractType && console.log(local.contract_type !== api[instrument].contractType);
//   !isEqual(local.contract_value!,api[instrument].contractValue) && console.log(local.contract_value, api[instrument].contractValue);
//   !isEqual(local.list_timestamp!,api[instrument].listTime / 1000) && console.log(local.list_timestamp, api[instrument].listTime / 1000);
//   !isEqual(local.expiry_timestamp!,api[instrument].expireTime / 1000) && console.log(local.expire_timestamp, api[instrument].expireTime / 1000);
//   !isEqual(local.max_leverage!,api[instrument].maxLeverage) && console.log(local.max_leverage, api[instrument].maxLeverage);
//   !isEqual(local.min_size!,api[instrument].minSize) && console.log(local.min_size, api[instrument].minSize);
//   !isEqual(local.lot_size!,api[instrument].lotSize) && console.log(local.lot_size, api[instrument].lotSize);
//   !isEqual(local.tick_size!,api[instrument].tickSize) && console.log(local.tick_size, api[instrument].tickSize);
//   !isEqual(local.max_limit_size!,api[instrument].maxLimitSize) && console.log(local.max_limit_size, api[instrument].maxLimitSize);
//   !isEqual(local.max_market_size!,api[instrument].maxMarketSize) && console.log(local.max_market_size, api[instrument].maxMarketSize);
//   (local.suspense === (api[instrument].state === "live")) && console.log(local.suspense,api[instrument].state);

//----------------------------------- Instrument Type ------------------------------------------//
// import { Publish } from "./db/interfaces/instrument_type";

// async function awaitingsolong() {
//   async function insert(sourceRef: string) {
//     const key = await Publish(sourceRef);
//     console.log(key);
//     return key;
//   }
//   const key = await insert('Linea``r');
// }

// awaitingsolong();

//------------------------------------- Currency Type ------------------------------------------//
// import { Publish } from "./db/interfaces/currency";

// async function awaitingsolong() {
//   async function insert(symbol: string) {
//     const key = await Publish(symbol, false);
//     console.log(key);
//     return key;
//   }
//   const key = await insert('BMT');
// }

// awaitingsolong();

// //--------------------------------- Contract Type ------------------------------------------//
// import { Publish } from "./db/interfaces/contract_type";

// async function awaitingsolong() {
//   async function insert(sourceRef: string) {
//     const key = await Publish(sourceRef);
//     console.log(key);
//     return key;
//   }
//   const key = await insert('SWAP');
// }

// awaitingsolong();

//--------------------------------- Trade State ------------------------------------------//
// import { Key, State } from "./db/interfaces/trade_state";

// async function awaitingsolong() {
//   async function test() {
//     const key = await Key(State.Disabled);
//     return key;
//   }
//   const key = await test();
//   console.log(key);
// }

// awaitingsolong();

//----------------------------- Unique hex Key ------------------------------------------//
// import { UniqueKey } from "./db/query.utils";
// import { hex } from "./lib/std.util";

// const key = UniqueKey(6);
// const key2 = hex(key,3);
// console.log(key, key.length, key2)

// const key3 = hex(UniqueKey(6),3);

// console.log(key, key.length, key2, key3)

//----------------------------- Instrument Import ---------------------------------------//
// import { Import } from "./api/instruments";
// Import();

//-------------------------------- candles Import ---------------------------------------//
import type { IMessage } from "@lib/std.util";
import { clear } from "@lib/std.util";
import { Import } from "./api/candles";
import { State } from "./db/interfaces/trade_state";
import * as Candles from "@db/interfaces/candle";
import * as Periods from "@db/interfaces/instrument_period";

async function importCandles() {
  const instruments = await Periods.Fetch({ active_collection: true });
  console.log("Fetch filtered period:", instruments);

  instruments?.forEach((db, id) => {
    const ipc = clear({ state: "init", symbol: db.symbol!, node: id });
    const props: Candles.IKeyProps = {
      instrument: db.instrument!,
      symbol: db.symbol!,
      period: db.period!,
      timeframe: db.timeframe!,
    };
    Import(ipc, props, 1440);
  });
}

importCandles();

//------------------- Instrument fetch Test ---------------------------------------//
// import { Fetch } from "./db/interfaces/instrument";

// async function get() {
//   const instrument = await Fetch({symbol: ""}, {limit:3, fromSymbol:'AV'});
//   console.log(instrument);
// }

// get();

//------------------- Instrument Periiods Test ---------------------------------------//
// import { Fetch } from "./db/interfaces/instrument_period";

// async function get() {
//   const instrument = await Fetch({symbol: "XRP-USDT", timeframe: '15m'});
//   console.log(instrument);
// }

// get();

//------------------- Instrument Periods Key Test ---------------------------------------//
// import { State } from "./db/interfaces/trade_state";
// import { Key } from "./db/interfaces/instrument_period";

// async function get() {
//   const keys = await Key({ state: State.Enabled });
//   console.log(keys);
// }

// get();

//----------------------------- Event Triggers ------------------------------------------//
// import { CEvent, Event, Alert } from "@module/event";
// const event = CEvent();

// event.setEvent(Event.NewHour, Alert.Major);
// event.setEvent(Event.NewHigh, Alert.Nominal);
// event.setEvent(Event.NewBoundary, Alert.Minor);
// event.setEvent(Event.NewLow, Alert.Minor);
// event.setEvent(Event.NewOutsideBar, Alert.Major);

// console.log(event.eventText(Event.NewDay));
// console.log(event.activeEvents());

//----------------------------- Fibonacci Levels ------------------------------------------//

//+--------------------------------------------------------------------------------------+
//| Returns true on higher number|precision of the soruce(new) to benchmark(old)         |
//+--------------------------------------------------------------------------------------+
// export const isHigher = (source: number | string, benchmark: number | string, digits: number = 8): boolean => {
//   const arg1: string = typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits);
//   const arg2: string = typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits);

//   return arg1 > arg2;
// };

// const fibos = [
//   { level: 0, percent: 0, state: "Root" },
//   { level: 1, percent: 0.236, state: ["Rally", "Pullback"] },
//   { level: 2, percent: 0.382, state: ["Rally", "Pullback"] },
//   { level: 3, percent: 0.5, state: "Retrace" },
//   { level: 4, percent: 0.618, state: "Retrace" },
//   { level: 5, percent: 0.764, state: ["Correction", "Recovery"] },
//   { level: 6, percent: 1, state: ["Breakout", "Reversal"] },
//   { level: 7, percent: 1.618, state: "Extension" },
//   { level: 8, percent: 2.618, state: "Extension" },
//   { level: 9, percent: 3.618, state: "Extension" },
//   { level: 10, percent: 4.236, state: "Extension" },
//   { level: 11, percent: 8.236, state: "Extension" },
// ];

// const FiboLevel = (percent: number) => {
//   const level = {};
//   fibos
//     .slice()
//     .reverse()
//     .some((fibo) => {
//       console.log([isHigher(percent, fibo.percent, 3), percent, fibo.percent], fibo, "\n");
//       //      if (isHigher(percent,fibo.percent,3)){
//       if (percent > fibo.percent) {
//         Object.assign(level, fibo);
//         return true;
//       }
//     });
//   return level;
// };

// console.log(FiboLevel(0.237));
