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

//----------------------------- Instrument Import ---------------------------------------//
import { Import } from "./api/candles";
import * as Candles from "@db/interfaces/candle"
import * as Periods from "@db/interfaces/instrument_period"
import { State } from "./db/interfaces/trade_state";

async function importCandles() {
  const instruments = await Periods.Fetch({state: State.Enabled},999);
  console.log("Fetch filtered period:", instruments);

  instruments?.forEach ((db) => {
    const props: Candles.IKeyProps = {
      instrument: db.instrument!,
      symbol: db.symbol!,
      period: db.period!,
      timeframe: db.timeframe!,
    };
    Import<Candles.IKeyProps>(props, 1440);
  })
  
}

importCandles();
//------------------- Instrument Periods Key Test ---------------------------------------//
// import { State } from "./db/interfaces/trade_state";
// import { Key } from "./db/interfaces/instrument_period";

// async function get() {
//   const keys = await Key({ state: State.Enabled });
//   console.log(keys);
// }

// get();
//----------------------------- Event Triggers ------------------------------------------//
// import { CEvent, Event, Alert } from "@class/event";
// const event: CEvent = new CEvent();

// console.log(event);

// event.setEvent(Event.NewHour, Alert.Major);
// event.setEvent(Event.NewHigh, Alert.Nominal);
// event.setEvent(Event.NewBoundary, Alert.Minor);
// event.setEvent(Event.NewLow, Alert.Minor);
// event.setEvent(Event.NewOutsideBar, Alert.Major);

// console.log(event.eventText(Event.NewDay));
// console.log(event.activeEvents());
