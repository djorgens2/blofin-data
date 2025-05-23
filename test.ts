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

//----------------------------- Role/Privs Import ---------------------------------------//
//import * as Authority from "@db/interfaces/authority";
//import * as Subject from "@db/interfaces/subject";
//import * as Activity from "@db/interfaces/activity";

// Authority.Import();
// Subject.Import();
//Activity.Import();

//-------------------------------- candles Import ---------------------------------------//
// import type { IMessage } from "@lib/std.util";
// import { clear } from "@lib/std.util";
// import { Import } from "./api/candles";
// import { State } from "./db/interfaces/trade_state";
// import * as Candles from "@db/interfaces/candle";
// import * as Periods from "@db/interfaces/instrument_period";

// async function importCandles() {
//   const instruments = await Periods.Fetch({ active_collection: true });
//   console.log("Fetch filtered period:", instruments);

//   instruments?.forEach((db, id) => {
//     const ipc = clear({ state: "init", symbol: db.symbol!, node: id });
//     const props: Candles.IKeyProps = {
//       instrument: db.instrument!,
//       symbol: db.symbol!,
//       period: db.period!,
//       timeframe: db.timeframe!,
//     };
//     Import(ipc, { ...props, limit: 1440});
//   });
// }

// importCandles();

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

//----------------------------- test synchronous forEach ------------------------------------------//
// interface IFibo {
//   level: number;
//   percent: number;
//   state: string | Array<string>;
// }
// function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }
// function delay2(ms: number) {
//   setTimeout(function () {
//     console.log("done");
//   }, ms);
// }
// const fibos: Array<IFibo> = [
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

// const test1 = () => {
//   console.log('t1-start');
//   const slow = async () => await new Promise(resolve => setTimeout(resolve, 10000));
//   slow();
//   console.log('t1-end');
// }
// const test2 = () => {
//   console.log('t2-start');
//   const slow = async () => await new Promise(resolve => setTimeout(resolve, 5000));
//   slow();
//   console.log('t2-end');
// }
// const test3 = () => {
//   console.log('t3-start');
//   const slow = async () => await new Promise(resolve => setTimeout(resolve, 2500));
//   slow();
//   console.log('t3-end');
// }
// const test4 = () => {
//   console.log('t4-start');
//   const slow = async () => await new Promise(resolve => setTimeout(resolve, 100));
//   slow();
//   console.log('t4-end');
// }
// const test1 = () => {
//   console.log('t1-start');
//   delay2(10000);
//   console.log('t1-end');
// }
// const test2 = () => {
//   console.log('t2-start');
//   delay2(5000);
//   console.log('t2-end');
// }
// const test3 = () => {
//   console.log('t3-start');
//   delay2(2500);
//   console.log('t3-end');
// }
// const test4 = () => {
//   console.log('t4-start');
//   delay2(100);
//   console.log('t4-end');
// }
// const test1 = async (id: number) => {
//   console.log("t1-start", id);
//   await delay(10000);
//   console.log("t1-end");
// };
// const test2 = async (id: number) => {
//   console.log("t2-start", id);
//   await delay(5000);
//   console.log("t2-end");
// };
// const test3 = async (id: number) => {
//   console.log("t3-start", id);
//   await delay(2500);
//   console.log("t3-end");
// };
// const test4 = async (id: number) => {
//   console.log("t4-start", id);
//   await delay(100);
//   console.log("t4-end");
// };
// const update = async (fibo: IFibo) => {
//   await test1(fibo.level);
//   await test2(fibo.level);
//   await test3(fibo.level);
//   await test4(fibo.level);
//   console.log("Finished:", fibo);
//   console.log("-------------------- FINAL -------------------------------");
// };
// console.log("------------------- START --------------------------------");
// fibos.forEach((fibo, id) => {
//      update(id);
// });

// const test = async () => {
//   for (const fibo in fibos) {
//     await update(fibos[fibo]);
//     console.log("Fibo:", fibos[fibo].level);
//   }
// };
// const test = async () => {
//   for (let index = fibos.length - 1; index >= 0; index--) {
//     await update(fibos[index]);
//     console.log("Fibo:", fibos[index].level);
//   }
// };
// async function wrapper() {
//   console.log("-------------------- Inner START ---------------------------------");
//   await test();
//   console.log("-------------------- Inner FINISHED ---------------------------------");
// }
// wrapper();
// console.log("-------------------- END ---------------------------------");
// fibos.forEach(async (fibo) => {
//    await test1()
//   .then(async (result) => {await test2()})
//   .then(async (result) => {await test3()})
//   .then(async (result) => {await test4()})
// })

// Main process

//----------------------------- test type v enum conversion (Role) ------------------------------------------//
import * as State from "@db/interfaces/state"
// import * as Role from "@db/interfaces/role"

State.Import();
// Role.Import();

//----------------------------- test type v enum conversion (Role) ------------------------------------------//
// import * as SubjectRoleAuthority from "@db/interfaces/subject_role_authority";

// const imports = async () => {
//   const inserts = await SubjectRoleAuthority.Import({ enabled: false });
//   console.log("Rows Inserted:", inserts);
//   const updates = await SubjectRoleAuthority.Enable({ title: "Admin" });
//   console.log("Rows updated:", updates);
// };
// const enable = async () => {
//   const count = await SubjectRoleAuthority.Enable({ title: "Admin" });
//   console.log("Rows updated:", count);
// };
// const step1 = imports();
//const step2 = enable();

//----------------------------- create crypto hmac ------------------------------------------//
// import * as dotenv from "dotenv";
// import * as path from "path";
// import { hex, parseJSON } from "./lib/std.util";
// import { UniqueKey } from "./db/query.utils";

// dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// console.log(process.env.BF_SECRET);

// const position = Math.floor(Math.random() * 12 + 1);
// console.log(position)
// console.log(hex(`0x${process.env.BF_SECRET!.slice(position*2,(position*2)+6)}`,3))
// console.log(`0x${process.env.BF_SECRET!.slice(position*2,(position*2)+6)}`);

// const secret = process.env.BF_SECRET
// const uuid = new Uint8Array(16);

// for (let block=0; block*8<secret!.length; block++) {
//     console.log(secret?.slice(block*8,(block*8)+8));
//     uuid.set(hex(`0x${secret?.slice(block*8,(block*8)+8)}`,4),block*4);
// }
// console.log(uuid)

// console.log(process.env.APP_ACCOUNT);
// const json: Array<any> = process.env.APP_CONNECTIONS ? JSON.parse(process.env.APP_ACCOUNT!) : [``];//;
// json.forEach((record) => {
//     console.log(record)
// })
// // JSON String Representing an Array of Objects
// const jsonStr = '[{"name": "Adams", "age": 30}, {"name": "Davis", "age": 25}, {"name": "Evans", "age": 35}]';

// // Parse JSON string to array of objects
// const jsonArray = JSON.parse(jsonStr);

// // Output the array of objects
// console.log(jsonArray);

// export const newHashKey = (length: number = 32) => {
//   if (length % 2 === 0) {
//     const hashKey = new Uint8Array(length / 2);
//     const key = UniqueKey(length).slice(2);

//     for (let block = 0; block * 2 < length; block++) {
//       console.log(key.slice(block * 2, block * 2 + 2));
//       hashKey.set(hex(`0x${key?.slice(block * 2, block * 2 + 2)}`, 1), block);
//     }
//     console.log(key, hashKey);
//   }
//   return 0x00;
// };

// console.log(newHashKey(16))

//----------------------------- user password new/verify ------------------------------------------//
// import type { Role } from "@db/interfaces/role";

// import * as Users from "@db/interfaces/user";

// const username = "djorgens2";
// const email = "whoaman@gmail.com";
// const password = "John 1:1";
// const title: Role = "Admin";
// const image_url: string = "";
// const userAdd = async () => await Users.Add({ username, email, password, title, image_url });

// //userAdd();
// const login = async () => await Users.Login({ username, email: "junk", password: "junk"})
// console.log(login ? 'success' : 'error');

//----------------------------- pulling prompt options when keyed Uint8array ------------------------//
// const callApples = () => console.log("Apples");
// const callBananas = () => console.log("Bananas");
// const callOranges = () => console.log("Oranges");

// interface IType {
//   name: Uint8Array;
//   quantity: number;
//   func: Function;
// }
// const inventory: Array<IType> = [
//   { name: Buffer.from([0, 0, 1]), quantity: 2, func: callOranges },
//   { name: Buffer.from([0, 0, 2]), quantity: 0, func: callBananas },
//   { name: Buffer.from([0, 0, 3]), quantity: 5, func: callApples },
// ];

// const result = inventory.find(({ name }) => name.toString() === Buffer.from([0, 0, 2]).toString());
// result?.func();

// console.log(result);

//----------------------------- test type v enum conversion (Role) ------------------------------------------//
// import * as authority from "@db/interfaces/role_authority";

// function measureTime(func: Function) {
//   const startTime = performance.now();
//   func();
//   const endTime = performance.now();
//   return endTime - startTime;
// }

// const get = async () => {
//   const inserts = await authority.Import({ enabled: true });
//   console.log("Authorities inserted:", inserts);
// };
// const executionTime = measureTime(get);
// console.log(`Execution time: ${executionTime} milliseconds`);

//----------------------------- dynamic function handler ------------------------------------------//
// function t1() {console.log('in t1')};
// function t2(name:string) {console.log(`in t2 with ${name}`)};
// const func = "t2('dennis')";
// eval(func);

// const funcy = `console.log("in t2 with the fam!");`
// const fn = Function(funcy);
// fn();

// const fn1 = Function(`t1();`);
// //fn1();

// t1();

//----------------------------- dynamic function handler ------------------------------------------//
// const myObject = {
//     name: 'John',
//     age: 30,
//     city: 'New York'
//   };

//   const keys = Object.keys(myObject);

//   for (const key of keys) {
//     console.log(key);
//   }

//   for (const [key, value] of Object.entries(myObject)) {
//     console.log(`{${key}:"${value}"}`);
//   }

//----------------------------- dynamic key:value copier ------------------------------------------//
// function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
//     const result: Partial<Pick<T, K>> = {};
//     for (const key of keys) {
//       if (obj.hasOwnProperty(key)) {
//         result[key] = obj[key];
//       }
//     }
//     return result as Pick<T, K>;
//   }

//   // Example
//   const sourceObject = { a: 1, b: 'hello', c: true, d: { nested: 'value' } };
//   const selectedKeys = ['a', 'c'];
//   const newObject = pick(sourceObject, selectedKeys);
//   console.log(newObject); // Output: { a: 1, c: true }

//----------------------------- user update test ------------------------------------------//
// import * as Users from "@db/interfaces/user";

// const update = async () => {
//  const user = await Users.Add({username: 'xforce', email: 'xforce@x.com', password: 'xxx', title: 'Admin', status: 'Disabled'});
//   const user = await Users.Add({username: 'x', email: 'x@x.com', password: 'xxx', title: 'Admin', status: 'Disabled'});
//   const update = await Users.Update({ username: "x", email: "x@x.com", image_url: "./images/users/thexman", status: 'Enabled' });
//   const setpass = await Users.SetPassword({ username: "x", email: "x@x.com", password: "yyy" });
//   const login = await Users.Login({ username: "x", email: "x@x.com", password: "yyy" });
//  console.log([user, update, setpass, login]);
//   console.log([login]);
// };

// update();

//----------------------------- select list population test ------------------------------------------//
// interface fruitbasket {
//     id: number;
//     type: string;
// }
// interface fruits {
//     type: string;
//     user: string;
//     choices: fruitbasket;
// }
// const list = {type: `select`, user: 'dj'} 
// const choices: Array<fruitbasket> = [{id:1, type: `oranges`},{id:2, type: `apples`},{id:3, type: `bananas`},{id:4, type: `lemons`},{id:5, type: `kumquats`},];
// console.log(Object.assign(list, {...list, choices}))

//----------------------------- select list population test(2) ------------------------------------------//
// interface fruitbasket {
//     id: number;
//     type: string;
// }
// interface fruits {
//     type: string;
//     user: string;
//     choices: fruitbasket;
// }
// const list = {type: `select`, user: 'dj'} 
// const choices: Array<fruitbasket> = [{id:1, type: `oranges`},{id:2, type: `apples`},{id:3, type: `bananas`},{id:4, type: `lemons`},{id:5, type: `kumquats`},];
// console.log(Object.assign(list, {...list, choices}))
