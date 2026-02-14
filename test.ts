//----------------------------------- KeySet tests ------------------------------------------//
// import { KeySet, IKeyProps } from "./db/interfaces/keyset";

//import { parseColumns, parseKeys } from "db/query.utils";
// import { ILeverageAPI, Instruments } from "api/instruments";
// import { IInstrument } from "db/interfaces/instrument";
import { ILeverageAPI } from "api/leverage";
import { TPosition } from "db/interfaces/instrument_position";
import { IPublishResult, PrimaryKey } from "api/api.util";
import { Distinct } from "db/query.utils";
import { hexify } from "lib/crypto.util";
import { bufferString, delay, fileWrite, hexString, isEqual, setExpiry } from "lib/std.util";
import { config, Session } from "module/session";
import { parse } from "path";

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

// //----------------------------- Account Import ---------------------------------------//
// import { Import } from "db/interfaces/account";
// const imports = async() => {
//   const new_accts = await Import();
//   console.log(new_accts)
// }
// imports();

//----------------------------- Role/Privs Import ---------------------------------------//
//import * as Authority from "db/interfaces/authority";
//import * as Subject from "db/interfaces/subject_area";
//import * as Activity from "db/interfaces/activity";

// Authority.Import();
// Subject.Import();
//Activity.Import();

//-------------------------------- candles Import ---------------------------------------//
// import type { IMessage } from "lib/std.util";
// import { clear } from "lib/std.util";
// import { Import } from "./api/candles";
// import { State } from "./db/interfaces/trade_state";
// import * as Candles from "db/interfaces/candle";
// import * as Periods from "db/interfaces/instrument_period";

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
// import { CEvent, Event, Alert } from "module/event";
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
//import * as Environs from "db/interfaces/environment"
//import * as State from "db/interfaces/state"
// import * as Role from "db/interfaces/role"

//Environs.Import();
// Role.Import();

//----------------------------- test type v enum conversion (Role) ------------------------------------------//
// import * as SubjectRoleAuthority from "db/interfaces/subject_role_authority";

// const imported = async () => {
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
// import { parseJSON } from "./lib/std.util";
// import { hexify, hashKey } from "./lib/crypto.util"

// dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// // ----- working ----- //
// // console.log(process.env.BF_SECRET);

// // const position = Math.floor(Math.random() * 12 + 1);
// // console.log(position)
// // console.log(hexify(`${process.env.BF_SECRET!.slice(position*2,(position*2)+6)}`))
// // console.log(`${process.env.BF_SECRET!.slice(position*2,(position*2)+6)}`);

// // const key = hexify(`${process.env.BF_SECRET!.slice(position*2,(position*2)+6)}`);
// // console.log(key?.toString());

// console.log(process.env.APP_ACCOUNT);
// const json: Array<any> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
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
// import type { Role } from "db/interfaces/role";

// import * as Users from "db/interfaces/user";

// const username = "djorgens2";
// const email = "whoamangmail.com";
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
// import * as authority from "db/interfaces/role_authority";

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
// import * as Users from "db/interfaces/user";

// const update = async () => {
//  const user = await Users.Add({username: 'xforce', email: 'xforcex.com', password: 'xxx', title: 'Admin', status: 'Disabled'});
//   const user = await Users.Add({username: 'x', email: 'xx.com', password: 'xxx', title: 'Admin', status: 'Disabled'});
//   const update = await Users.Update({ username: "x", email: "xx.com", image_url: "./images/users/thexman", status: 'Enabled' });
//   const setpass = await Users.SetPassword({ username: "x", email: "xx.com", password: "yyy" });
//   const login = await Users.Login({ username: "x", email: "xx.com", password: "yyy" });
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

//----------------------------- check web/site availability test ------------------------------------------//
// async function checkURL(url: string) {
//     try {
//         const response = await fetch(url, { mode: 'no-cors' });
//         if (response.status === 200) {
//             console.log(`URL "${url}" is online.`);
//         } else {
//             console.log(`URL "${url}" is online but returned status ${response.status}.`);
//         }
//     } catch (error) {
//         console.log(`URL "${url}" is offline or an error occurred:`, error);
//     }
// }

// // checkURL('https://www.google.com');
// // checkURL('https://google.com');
// checkURL('https://blofin.com/')

//checkURL('https://invalid-url');

//----------------------------- Prompts testing -------------------------------------------------------//
// import Prompts from "cli/modules/Prompts";
// import * as Accounts from "db/interfaces/account";
// const imports = [
//   {
//     name: "Blofin",
//     api: "6d25db314497499987681bafa75f4bf0",
//     key: "8a964e2c76a54791822504eac9838c53",
//     phrase: "BlofinOnSteroids",
//     wss: "wss://openapi.blofin.com/ws/private",
//     rest_api: "https://openapi.blofin.com/api/v1/",
//   },
// ];
// const imported = imports[0];
// const newAccount: Partial<Accounts.IAccount> = {};
// const getAccount = async <T>(props: T) => {
//     const name = await Prompts(['text'],{ message: "   Name:", initial: 'Your first name'});
//     return {name}
// }
// Object.assign(newAccount, {
//   ...newAccount,
//   name: imported.name,
//   api_key: imported.api,
//   key: imported.key,
//   phrase: imported.phrase,
//   websocket_url: imported.wss,
//   rest_api_url: imported.rest_api,
// });

// async function get() {
// console.log(await getAccount(newAccount));
// }

// get();

// //----------------------------- Key/Value element Extraction -------------------------------------------------------//
// import * as Accounts from "db/interfaces/account";
// import { hexify } from "lib/crypto.util";

// const account = hexify("0x044e54");
// const currency = hexify("0x044e54");
// Accounts.UpdateDetail({
//   account,
//   currency,
//   balance: 100,
//   equity: 100,
//   isolated_equity: 100,
//   available: 100,
//   available_equity: 100,
//   equity_usd: 100,
//   frozen: 100,
//   order_frozen: 100,
//   borrow_frozen: 100,
//   unrealized_pnl: 100,
//   isolated_unrealized_pnl: 100,
//   coin_usd_price: 100,
//   margin_ratio: 100,
//   spot_available: 3,
//   liability: 2,
//   update_time: 1,
// });

// function parseObject<T extends Record<string, any>>(obj: T) {
//   const fields = [];
//   const args:Array<any> = []

//   for (const key in obj) {
//     if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
//       fields.push(key);
//       args.push(obj[key]);
//     }
//   }

//   return [fields, args];
// }

// interface IRec {
//   field1: string;
//   field2: string;
//   field3: number;
//   field4: Uint8Array;
// }

// const rec1 = { field1: 'ABC', field3: 123 };

// console.log(parseObject<IRec>(rec1))

//----------------------------- Copy defined elements -------------------------------------------------------//
// export const copyDefined = <S extends object, T extends Partial<Record<keyof S, any>>>(source: S, target: T): void => {
//   for (const key in source) {
//     const k = key as keyof S;
//     if (source[k] !== undefined) {
//       (target as any)[key] = source[k];
//     }
//   }
// }

// Example usage:
// const sourceObject = { a: 1, b: undefined, c: 3, d: 32 };
// const targetObject: Partial<{ a: number; b: number; c: number }> = {};

// copyDefined(sourceObject, targetObject);

// console.log(targetObject); // Output: { a: 1, c: 3 }
// function copyDefinedElements<S extends object, T extends Partial<Record<keyof S, any>>>(source: S, target: T): void {
//   for (const key in source) {
//     const k = key as keyof S;
//     if (source[k] !== undefined) {
//       (target as any)[key] = source[k];
//     }
//   }
// }

// copyDefinedElements(sourceObject, targetObject);

// console.log(targetObject); // Output: { a: 1, c: 3 }

//----------------------------- load refs generic -------------------------------------------------------//
// import { Import } from "db/interfaces/reference";

// const load = async () => {
//   Import();
// };
// load();

//----------------------------------------- Generic fetch v. CRUD fetch performance test (hmmm...)------------------------------//
// *-------------------------- round 1 --------------------------*
// From Interface Fetch returned in 0.11948900000004414ms
// From Generic Fetch returned in 0.44306899999997995ms
// *-------------------------- round 2 --------------------------*
// From Interface Fetch returned in 0.0050420000000030996ms
// From Generic Fetch returned in 0.43795299999999315ms
// *-------------------------- round 3 --------------------------*
// From Interface Fetch returned in 0.009750999999994292ms
// From Generic Fetch returned in 0.5313919999999825ms

// const getRef = async (table: string, props: object) => {
//   const data = await Refs.Fetch(table, props);
//   console.log(data)
// };

// const getInst = async (props: object) => {
//   const data = await Instruments.Fetch(props);
//   console.log(data)
// };

// //getRef("category", { source_ref: `tp`, trigger_type: });
// getRef("category", { trigger_type: true});

// let st
// let et

// console.log('*-------------------------- round 1 --------------------------*')
// st = performance.now();
// getInst( { fromSymbol: 'BTC-USDT', limit: 1});
// et = performance.now();
// console.log(`From Interface Fetch returned in ${et - st}ms`);

// st = performance.now();
// getRef("vw_instruments", { symbol: 'BTC-USDT'});
// et = performance.now();
// console.log(`From Generic Fetch returned in ${et - st}ms`);

// console.log('*-------------------------- round 2 --------------------------*')
// st = performance.now();
// getInst( { fromSymbol: 'BTC-USDT', limit: 1});
// et = performance.now();
// console.log(`From Interface Fetch returned in ${et - st}ms`);

// st = performance.now();
// getRef("vw_instruments", { symbol: 'BTC-USDT'});
// et = performance.now();
// console.log(`From Generic Fetch returned in ${et - st}ms`);

// console.log('*-------------------------- round 3 --------------------------*')
// st = performance.now();
// getInst( { fromSymbol: 'BTC-USDT', limit: 1});
// et = performance.now();
// console.log(`From Interface Fetch returned in ${et - st}ms`);

// st = performance.now();
// getRef("vw_instruments", { symbol: 'BTC-USDT'});
// et = performance.now();
// console.log(`From Generic Fetch returned in ${et - st}ms`);

//----------------------------- generic refs test  -------------------------------------------------------//
// import * as Reference from "db/interfaces/reference";
// const checkRef = async () => {
//   const cancel_dflt = await Reference.Fetch<Reference.IKeyProps>("cancel", { source_ref: "not_canceled" });
//   console.log(cancel_dflt);
// };
// checkRef();

//----------------------------- expiry calc test  -------------------------------------------------------//
//import { setExpiry } from "lib/std.util";

// console.log(setExpiry(`1m`))

//----------------------------- order test  -------------------------------------------------------//
// import { hexify } from "lib/crypto.util";
// import * as Orders from "db/interfaces/order";
// import * as Requests from "db/interfaces/request";
// import * as OrderAPI from "api/orders";

// const order_request = {
//   instId: "BTC-USDT",
//   marginMode: "cross",
//   side: "buy",
//   orderType: "limit",
//   price: (95000.1).toFixed(1),
//   size: "0.1",
//   leverage: "3",
//   positionSide: "long",
// };

// const api_order: Array<OrderAPI.IOrderAPI> = [
//   {
//     instType: "SWAP",
//     instId: "BTC-USDT",
//     orderId: "4000011703777",
//     clientOrderId: "0x25d921",
//     price: "93000.100000000000000000",
//     size: "0.1",
//     orderType: "limit",
//     side: "buy",
//     positionSide: "long",
//     marginMode: "cross",
//     filledSize: "0",
//     filledAmount: "0.000000000000000000",
//     averagePrice: "0.000000000000000000",
//     state: "live",
//     leverage: "3",
//     tpTriggerPrice: null,
//     tpOrderPrice: null,
//     slTriggerPrice: null,
//     slOrderPrice: null,
//     fee: "0.000000000000000000",
//     pnl: "0.000000000000000000",
//     cancelSource: "",
//     orderCategory: "normal",
//     createTime: "1748915537513",
//     updateTime: "1748915537524",
//     reduceOnly: "false",
//     brokerId: "",
//   },
// ];

// const request: Partial<Requests.IRequest> = {
//   client_order_id: undefined!,
//   state: undefined!,
//   account: hexify("145a6a")!,
//   instrument: hexify("4e3e8a")!,
//   margin_mode: "cross",
//   position: "long",
//   action: "buy",
//   order_type: hexify("6eb6c5"),
//   price: 93000.1,
//   size: 0.1,
//   leverage: 10,
//   tp_trigger: undefined!,
//   sl_trigger: undefined!,
//   reduce_only: undefined!,
//   expiry_time: new Date(),
// };

// const req = Requests.Submit(request);
// const exec = Order.Execute();
// import * as Orders from "db/interfaces/order";
// import * as OrderAPI from "api/orders";
// const api: Array<Partial<OrderAPI.IOrderAPI>> =
// [
//   {
//     orderId: '4000011703777',
//     clientOrderId: '0x25d921',
//     instId: 'BTC-USDT',
//     marginMode: 'cross',
//     positionSide: 'long',
//     side: 'buy',
//     orderType: 'limit',
//     price: '93000.100000000000000000',
//     size: '0.100000000000000000',
//     reduceOnly: 'false',
//     leverage: '3',
//     state: 'live',
//     filledSize: '0.000000000000000000',
//     averagePrice: '0.000000000000000000',
//     fee: '0.000000000000000000',
//     pnl: '0.000000000000000000',
//     createTime: '1748915537513',
//     updateTime: '1748915537524',
//     orderCategory: 'normal',
//     tpTriggerPrice: null,
//     slTriggerPrice: null,
//     slOrderPrice: null,
//     tpOrderPrice: null,
//     brokerId: '',
//     algoClientOrderId: '',
//     algoId: '',
//     filledAmount: '0.000000000000000000',
//     filled_amount: '0.000000000000000000'
//   }
// ];

// const order = async () => {
//   const processed = await OrderAPI.Publish(api);
// }

// order();

//----------------------------- expiry calc test  -------------------------------------------------------//
// import { setExpiry } from "lib/std.util";

// console.log(setExpiry(`30s`));

//----------------------------- number test -------------------------------------------------------//
// import { format } from "lib/std.util";

// console.log(format(''));
// console.log(format('abc'));
// console.log(format('123.567'));
// console.log(format('xxx123.567'));
// console.log(format('123.567aaabc'));
// console.log(format(null));
// import { hexify } from "lib/crypto.util";

// const test = "171717";
// const hex1 = parseInt(test);
// const hex2 = hex1.toString(16).padStart(8, "0");
// const buf = Buffer.from(hex2, "hex");
// const buf2 = Buffer.from(parseInt(test).toString(16).padStart(8, "0"),'hex');
// console.log(hex1, hex2, buf, buf2, hexify(parseInt(test),4));

//----------------------------- useful code! -----------------------------//
// import { IOrderAPI } from "api/orders";
// //const body = `[${JSON.stringify((({ instId, orderId, clientOrderId }) => ({ instId, orderId, clientOrderId }))(cancel))}]`;
// const cancel: Array<Partial<IOrderAPI>> = [
//   { instId: "BTC-USDT" },
//   { orderId: "4000012355467" },
//   { clientOrderId: "0xc0ffee" },
//   { instId: "BTC-USDT", orderId: "4000012355467", clientOrderId: "0xc0ffee" },
// ];
// const body = console.log(JSON.stringify(cancel.map(({ instId, orderId, clientOrderId }) => ({ instId, orderId, clientOrderId }))));

//----------------------------------------- State generic fetch test ----------------------------------//
// import * as Reference from "db/interfaces/reference"

// const getKey = async (table: string, key: string)  => {
//   console.log(await Reference.Key(table, {source_ref: key}));
// }

// getKey('cancel_source', 'user_canceled');
// getKey('order_state', 'live');
// getKey('order_type', 'cross');
// //getKey('price_type', 'cro');

// interface MyObject {
//   name: string;
//   age: number;
//   city: string;
// }

// const myObject: MyObject = {
//   name: "Alice",
//   age: 30,
//   city: "New York",
// };

// const keyName: keyof MyObject = "age"; // The key name is stored in a variable

// const value = myObject[keyName]; // Access the value using bracket notation with the variable

// console.log(value); // Output: 30

//----------------------------- order test  -------------------------------------------------------//
// import { hexify } from "lib/crypto.util";
// import { setExpiry } from "lib/std.util";
// import { setSession } from "module/session";
// import * as Requests from "db/interfaces/request";

// //-- test 1; request w/ no tpsl; 100%
// const request1: Partial<Requests.IRequest> = {
//   instrument: hexify("4e3e8a")!,
//   margin_mode: "cross",
//   position: "short",
//   action: "sell",
//   request_type: hexify("6eb6c5"),
//   price: 109000,
//   size: 300,
//   leverage: 10,
//   expiry_time: setExpiry("30m"),
// };

// setSession({ account: hexify("145a6a")})
// const req1 = Requests.Submit(request1);

//-- test 2; with ck con errors; 100%
// const request2: Partial<Requests.IRequest> = {
//   request: undefined,
//   state: undefined,
//   account: hexify("145a6a")!,
//   instrument: hexify("4e3e8a")!,
//   margin_mode: "cross",
//   position: "top",
//   action: "drop",
//   order_type: hexify("6eb6c5"),
//   price: 93000.1,
//   size: 0.1,
//   leverage: 10,
//   reduce_only: undefined,
//   expiry_time: setExpiry("30m"),
// };

//----------------------------- expiry calc test  -------------------------------------------------------//
// import { setExpiry } from "lib/std.util";
// import { Process } from "api/requests"

// const open = setExpiry('45s');
// const close = setExpiry('30s');
// const expiry = setExpiry('0s');

// if (close>open) console.log('close is higher');
// if (open>close) console.log('open is higher');

// console.log (open,close,expiry);

// const go = async () => {
//   const rejects = await Process();
// }

// go();

//----------------------------- order fetch key test  -------------------------------------------------------//
// import { hexify } from "lib/crypto.util";
// import { Key } from "db/interfaces/order";

// const go = async () => {
//   const or_id = await Key({ order_id: 1000107956455 });
//   const cl_id = await Key({ client_order_id: hexify("43a912") });
//   const no_id = await Key({ status: "Canceled" });
//   const no_param = await Key({});

//   console.log({ or_id, cl_id, no_id, no_param });
// };

// go();

//----------------------------- order fetch key test  -------------------------------------------------------//
// import { hashKey, hexify, uniqueKey } from "lib/crypto.util";
// import { Key } from "db/interfaces/order";

// const go = async () => {
//   const hash = uniqueKey(10);
//   const key = hexify(hash,6);
//   console.log(key, key?.byteLength);
// };

// go();

// console.log(hexify(uniqueKey(10),6));

//----------------------------- fetch order state test  -------------------------------------------------------//
// import * as Orders from "db/interfaces/order";

// const go = async () => {
//   const state = await Orders.State({order_status: 'live'});
//   console.log(state);
// };

// go();

//----------------------------------- Instrument Position ------------------------------------------//
// import { Publish } from "db/interfaces/instrument_position";

// (async () => await Publish())();

//----------------------------------- Import State ------------------------------------------//
// import { Import } from "db/interfaces/state";

// (async () => await Import())();

//----------------------------- tp/sl test  -------------------------------------------------------//
// import { hexify } from "lib/crypto.util";
// import { setSession } from "module/session";
// import * as Stops from "api/stops";
// import { IStopsAPI } from "api/stops";

// //-- test 1; request w/ no tpsl; 100%
// const subtp1: Partial<IStopsAPI> = {
//   instId: 'BTC-USDT',
//   marginMode: "cross",
//   positionSide: "short",
//   side: "buy",
//   tpTriggerPrice: '108000',
//   tpOrderPrice: '107500',
//   size: '700',
//   reduceOnly: 'false',
//   clientOrderId: '00c0ffee-tp'
// };

// setSession({ account: hexify("145a6a")})
// const tp1 = Stops.Submit(subtp1);

//----------------------------- runtime type test  -------------------------------------------------------//
// import { IStopOrder, Submit } from "db/interfaces/stops";
// import * as Instruments from "db/interfaces/instrument";
// import { hexify } from "lib/crypto.util";
// const subtp1: Partial<IStopOrder> = {
//   //stop_request: hexify("00abcdef",4),
//   //order_state: 'live',
//   symbol: "btc-USDT",
//   position: "short",
//   broker_id: "wtf",
//   stop_type: "tp",
//   action: "buy",
//   trigger_price: parseFloat("108000"),
//   order_price: parseFloat("107500"),
//   size: parseFloat("700"),
//   reduce_only: false,
// //  create_time: parseInt("1748915537513"),
// };

// const request: Partial<IStopOrder> = {
//   symbol: "BTC-USDT",
//   position: "short",
//   stop_type: "tp",
//   action: "buy",
//   trigger_price: parseFloat("108000"),
//   order_price: parseFloat("107500"),
//   size: parseFloat("700"),
//   reduce_only: false,
// };

// //const parsed = Object.entries(subtp1).reduce((acc, [key, value]) => {
// const parse = async (props: Partial<IStopOrder>) => {
//   const request = await Submit(subtp1);
//   console.log({request, props});
// //  const key = await Instruments.Key({ symbol: subtp1.symbol });
// //  const key = await Instruments.Key({});
// //  console.log({key, props})
// process.exit(1);
// };
// parse(subtp1);

//----------------------------- order test  -------------------------------------------------------//
// import { setExpiry } from "lib/std.util";
// import { setSession } from "module/session";
// import { IStopOrder, Submit } from "db/interfaces/stops";
// import { hexify } from "lib/crypto.util";
// import * as Requests from "db/interfaces/request";
// import * as Instruments from "db/interfaces/instrument";

// //-- test 1; request w/ no tpsl; 100%
// const request: Partial<Requests.IRequest> = {
// //  instrument: hexify("4e3e8a")!,
//   symbol: "XRP-USDT",
//   margin_mode: "cross",
//   position: "short",
//   action: "sell",
// //  request_type: hexify("6eb6c5"),
//   order_type: 'limit',
//   price: 3.5,
//   size: 100,
//   leverage: 50,
//   expiry_time: setExpiry("2m"),
// };

// setSession({ account: hexify("145a6a")});

// const submit = async () => {
//   const op = await Requests.Submit(request);
//   console.log({op, request});
//   return op;
// };

// submit();

//----------------------------- uint compare test ----------------------------------------------//
// const inUint = hexify('c0ffee',3);
// const outUint = hexify('c0fefe',3);
// //const outUint = hexify('c0ffee',3);

// const test = inUint!.every((value, index) => value === outUint![index]);
// console.log(`inUint ${test ? 'equals' : 'does NOT equal'} outUint`);
// console.log(isEqual(inUint!,outUint!));

//----------------------------- datetime conversion test ----------------------------------------------//
// import { Modify, Select } from "db/query.utils";

// const put = async (ts1: number, ts2?: number) => {
//   const dt1 = new Date(ts1);
//   const dt2 = ts2 ? new Date(ts2) : setExpiry("1h");
//   console.log(dt1, dt2);

//   const db = await Modify("insert into fractional_time_test2 values (? ,?)", [dt1, dt2]);
//   const [time] = await Select<{ in_time: Date; out_time: Date }>(`select * from blofin.fractional_time_test2`, []);
//   console.log({ time, in_date: new Date(time.in_time!), out_date: new Date(time.out_time!), in_time: time.in_time!, out_time: time.out_time });
// };

// put(1754602401957, setExpiry("1h"));

//----------------------------- Candle Finder Test ---------------------------------------//
// interface IResult {
//   code: string;
//   msg: string;
//   data: Array<Array<any>>;
// }

// export const finder = async (props: { symbol: string; timeframe: string; start_timestamp: number }): Promise<number> => {
//   let last_timestamp = props.start_timestamp;

//   do {
//     let after = last_timestamp ? `&after=${last_timestamp}` : "";
//     console.log(`Fetching candles for ${props.symbol} after ${after}`);
//     try {
//       const response = await fetch(
//         `https://openapi.blofin.com/api/v1/market/candles?instId=${props.symbol}&limit=100&bar=${props.timeframe}${after ? after : ""}`
//       );

//       if (response.ok) {
//         const json = await response.json();
//         const result: IResult = json;
//         if (result.data.length) {
//           last_timestamp = result.data[result.data.length - 1][0];
//         } else return last_timestamp;
//       }
//     } catch (error) {
//       console.log(error);
//       return last_timestamp;
//     }

//     await new Promise((r) => setTimeout(r, 5000));
//   } while (true);
// };

// finder({ symbol: "XRP-USDT", timeframe: "15m", start_timestamp: 1673741700000 }).then((res) => console.log(res));

//----------------------------- Candle Loader Test ---------------------------------------//
// import * as Candles from "api/candles";

// //Candles.Loader({ symbol: "BTC-USDT", timeframe: "15m", start_time: 1673604000000 }).then((res) => {
// const symbol = process.argv[2] || "BTC-USDT";
// const timeframe = process.argv[3] || "15m";
// const start_time = process.argv[4] ? parseInt(process.argv[4]) : new Date().getTime();

// console.log({symbol, timeframe, start_time});

// Candles.Loader({ symbol, timeframe, start_time }).then((res) => {
//   console.log(res);
//   process.exit(0);
// });

//----------------------------- parsecolums test ----------------------------------------------//
// const submit = {
//   request: hexify("00bbb8267a54", 6),
//   account: hexify("23334e", 3),
//   instrument: hexify("cb42a5", 3),
//   position: "short",
//   action: undefined,
//   state: hexify("edc267", 3),
//   price: undefined,
//   size: undefined,
//   leverage: undefined,
//   request_type: undefined,
//   margin_mode: undefined,
//   reduce_only: undefined,
//   broker_id: undefined,
//   memo: undefined,
//   create_time: new Date("2025-08-29T17:15:58.975Z"),
//   update_time: new Date("2025-08-29T17:34:59.365Z"),
//   expiry_time: new Date("2025-08-30T01:34:59.365Z"),
// };

// const parser = (obj: object, suffix = "= ?") => {
//   const fields: string[] = [];
//   const args: any[] = [];
//   Object.keys(obj).forEach((obj, id) => {
//     fields.push(`${obj}${suffix}`);
//     args.push(Object.values(obj)[id]);
//   });
//   return [fields, args];
// };

// type TKey = {
//   key: string;
//   sign: string;
// };

// const keys: Array<TKey> = [
//   {
//     key: `position`,
//     sign: "=",
//   },
// ];

// const parseKeys = <T>(props: Partial<T>, keys?: Array<TKey>) => {
//   const key: Array<string> = [];
//   const value: Array<any> = [];

//   Object.keys(props).map((obj, id) => {
//     if (Object.values(props)[id] !== undefined) {
//       const { sign } = keys?.find((search) => search.key === obj) || { sign: ` = ?` };
//       key.push(`${obj}${sign}`);
//       value.push(Object.values(props)[id]);
//     }
//   });
//   return [key, value];
// };

//const [p1,p2] = parseCols(submit);
//console.log(p1,p2)
//const [fields, args] = parser(submit,"");
// const [key, value] = parseKeys(submit, [{ key: `position`, sign: ` >= ?` }]);
// console.log(key, value);
//console.log(fields, args, key, value);

//const [f2, a2] = parseColumns(submit);
//console.log(f2, a2);

// const [f3, a3] = parseColumns(submit, "");
// console.log(f3, a3);

//----------------------------- Activity Import Test ---------------------------------------//
//import * as Table from "db/interfaces/instrument_type";
//Table.Import();
//Table.Key({}).then ((res) =>{ console.log(res); });
//Table.Fetch({}).then ((res) =>{ console.log(res); });

//----------------------------- Candle Fetch Test ---------------------------------------//
// import * as Candle from "db/interfaces/candle";
// Candle.Fetch({ symbol: "XRP-USDT", timestamp: 1757649600000, limit: 10 }).then((result) => console.log(result));

//----------------------------- update property filter ---------------------------------------//
// import { Update } from "db/query.utils";

// export interface IRequest {
//   request: Uint8Array;
//   order_id: number;
//   client_order_id: string | undefined;
//   account: Uint8Array;
//   instrument: Uint8Array;
//   symbol: string;
//   state: Uint8Array;
//   status: TRequest;
//   request_state: Uint8Array;
//   request_status: TRequest;
//   margin_mode: "cross" | "isolated";
//   position: "short" | "long" | "net";
//   action: "buy" | "sell";
//   request_type: Uint8Array;
//   order_type: string;
//   price: number;
//   size: number;
//   leverage: number;
//   digits: number;
//   memo: string;
//   reduce_only: boolean;
//   broker_id: string;
//   create_time: Date | number;
//   expiry_time: Date | number;
//   update_time: Date | number;
// }

// const submit = {
//   request: hexify("00bbb8267a54", 6),
//   instrument_position: hexify("cb42a5", 3),
//   action: undefined,
//   state: hexify("edc267", 3),
//   price: undefined,
//   size: undefined,
//   leverage: undefined,
//   request_type: undefined,
//   margin_mode: undefined,
//   reduce_only: undefined,
//   broker_id: undefined,
//   memo: undefined,
//   create_time: new Date("2025-08-29T17:15:58.975Z"),
//   update_time: new Date("2025-08-29T17:34:59.365Z"),
//   expiry_time: new Date("2025-08-30T01:34:59.365Z"),
// } as Partial<IRequest>;

// //+--------------------------------------------------------------------------------------+
// //| Returns columns and keys in separate arrays;                                         |
// //+--------------------------------------------------------------------------------------+
// const splitKeys = <T>(props: Partial<T>, filter: Array<string>) => {
//   return Object.keys(props).reduce(
//     ([included, excluded]: [Record<string, any>, Record<string, any>], key: string): [Record<string, any>, Record<string, any>] => {
//       if (filter.includes(key)) {
//         excluded[key] = props[key as keyof typeof props];
//       } else {
//         props[key as keyof typeof props] !== undefined && (included[key] = props[key as keyof typeof props]);
//       }
//       return [included, excluded];
//     },
//     [{} as Record<string, any>, {} as Record<string, any>]
//   );
// };

// const [columns, filters] = splitKeys<IRequest>(submit, [ "request" ]);
// Object.keys(columns) && console.log(columns,filters);

// const upd = Update(submit, { table: `request`, keys: filter }).then((res) => console.log(res));
// const split = <T>(props: Partial<T>, filter: Array<string>) => {
//   return Object.keys(props).reduce(
//     ([included, excluded]: [Record<string, any>, Record<string, any>], key: string): [Record<string, any>, Record<string, any>] => {
//       if (filter.includes(key)) {
//         excluded[key] = props[key as keyof typeof props];
//       } else {
//         included[key] = props[key as keyof typeof props];
//       }
//       return [included, excluded];
//     },
//     [{} as Record<string, any>, {} as Record<string, any>]
//   );
// };
// const [props, keys] = split<IRequest>(submit, filter)
// const [props, keys] = Object.keys(submit).reduce(
//   ([included, excluded]: [Record<string, any>, Record<string, any>], key: string): [Record<string, any>, Record<string, any>] => {
//     if (filter.includes(key)) {
//       excluded[key] = submit[key as keyof typeof submit];
//     } else {
//       included[key] = submit[key as keyof typeof submit];
//     }
//     return [included, excluded];
//   },
//   [{} as Record<string, any>, {} as Record<string, any>] // Initial accumulator: two empty typed objects
// );
//console.log(upd);

//import * as Instruments from "api/instruments";
//Instruments.Import();

//----------------------------- Import / Fetch Tests ---------------------------------------//
// import * as Table from "db/interfaces/activity";
// console.log("// -- activity -- //");
// Table.Import();
// Table.Key({}).then((res) => {
//   console.log(`Empty keyset: ${res}`);
// });
// Table.Key({ task: `Accounts` }).then((res) => {
//   console.log(`Accounts key: ${bufferString(res!)}`);
// });
// Table.Fetch({}).then((res) => {
//   console.log(`Fetch:`, res);
// });
// import * as Table from "db/interfaces/authority";
// console.log("// -- authority -- //");
// Table.Import();
// Table.Key({}).then((res) => {
//   console.log(`Empty keyset: ${res}`);
// });
// Table.Fetch({}).then((res) => {
//   console.log(`Fetch:`, res);
// });
// Table.Key({ priority: 4 }).then((res) => {
//   console.log(`Priority key: ${bufferString(res!)}`);
// });
// import * as Table from "db/interfaces/broker";
// console.log("// -- broker -- //");
// (async () => {
//   await Table.Import();
//   setTimeout(async () => {
//     console.log(`Delay`);
//     await Table.Key({}).then((res) => {
//       console.log(`Empty keyset: ${res}`);
//     });
//     await Table.Fetch({}).then((res) => {
//       console.log(`Fetch:`, res);
//     });
//     await Table.Key({ name: `Blofin` }).then((res) => {
//       console.log(`Priority key: ${bufferString(res!)}`);
//     });
//     await Table.Fetch({ name: "blohard" }).then((res) => {
//       console.log(`Fetch not found:`, res);
//     });
//   }, 1500);
// })();
// import * as Candle from "db/interfaces/candle";
// import * as apiInst from "api/instruments";
// import * as api from "api/candles";

// import { clear } from "lib/app.util";

// console.log("// -- candle -- //");

// (async () => {
//   const symbol = `PONKE-USDT`;
//   await apiInst.Import();
//   await api.Import(clear({ state: `init`, symbol, node: 1 }), { symbol });

//   setTimeout(async () => {
//     console.log(`Delay`);
//     await Candle.Fetch({ symbol, limit: 10 }).then((res) => {
//       console.log(`Fetch:`, res);
//     });
//     await Candle.Fetch({ symbol: "obviously-wrong-answer" }).then((res) => {
//       console.log(`Fetch not found:`, res);
//     });
//     process.exit(0);
//   }, 1500);
// })();

//----------------------------- Suspended Tests ---------------------------------------//
// import * as Instrument from "db/interfaces/instrument";
// const props = keys.map(item => hexify(item, 3)).filter((item): item is Uint8Array => item !== undefined);
// Instrument.Audit(props);

//----------------------------- Format Console Lines Test ---------------------------------------//
// import type { IUser } from "db/interfaces/user";
// import * as User from "db/interfaces/user";

// const userLen = { username: 4, email: 20, state: 4, image_url: 30, create_time: 4, update_time: 4 };

// const format = async <T>(lengths: Record<string, number>, record: Array<Partial<T>>, padding = "   ") => {
//   if (record === undefined) return lengths;

//   return record.reduce((maxLengthObj: Record<string, number>, currentObj) => {
//     Object.keys(currentObj).forEach((key) => {
//       const currentValue = currentObj[key as keyof T];

//       if (typeof currentValue === 'string') {
//         const currentLength = currentValue.length;
//         const existingLength = maxLengthObj[key] || 0;

//         if (currentLength > existingLength) {
//           maxLengthObj[key] = currentLength;
//         }
//       }
//     });
//     return maxLengthObj;
//   }, { ...lengths } as Record<string, number>);
// };

// (async () => {
//   const users = await User.Fetch({});
//   const line = format<IUser>(userLen, users!);

//   console.log(line)

//   setTimeout(async () => {
//     process.exit(0);
//   }, 1500);
// })();

//----------------------------- Seed Load Tests ---------------------------------------//
// import * as Seed from "cli/interfaces/seed"

// Seed.Import();

//----------------------------- Reference Tests ---------------------------------------//
// type TRefKey = Uint8Array;
// type TRefText = string;
// import * as Refs from "db/interfaces/reference"

// ( async () => {

//     interface obj {
//       tcancel: Uint8Array;
//     }
//     const var1: Partial<obj> = {};
//     const cancel_source = await Refs.Key<TRefKey>({source_ref: `not_canceled`},{table: `cancel_source`});
//     console.log(cancel_source);

//     var1.tcancel = cancel_source;
//     console.log(var1)
//     })    ();

//----------------------------- Instrument Position Load Test ---------------------------------------//
// import * as Seed from "db/interfaces/instrument_position";

// Seed.Import();

//----------------------------- Split Keys Effect on processed set ----------------------------------//
// import type { IRequest } from "db/interfaces/request";
// import { splitKeys } from "db/query.utils";
// const submit = {
//   request: hexify("00bbb8267a54", 6),
//   instrument_position: hexify("cb42a5", 3),
//   action: undefined,
//   state: hexify("edc267", 3),
//   price: undefined,
//   size: undefined,
//   leverage: undefined,
//   request_type: undefined,
//   margin_mode: undefined,
//   reduce_only: undefined,
//   broker_id: undefined,
//   memo: undefined,
//   create_time: new Date("2025-08-29T17:15:58.975Z"),
//   update_time: new Date("2025-08-29T17:34:59.365Z"),
//   expiry_time: new Date("2025-08-30T01:34:59.365Z"),
// } as Partial<IRequest>;
// console.log(splitKeys<IRequest>(submit, [`request`]));

//----------------------------- Split Keys Effect on processed set ----------------------------------//
// const local = [{id: hexify('ababab',3)}, {id: hexify('bcbcbc',3)}, {id: hexify('cdcdcd',3)}, {id: hexify('dedede',3)}, {id: hexify('efefef',3)}, {id: hexify('fafafa',3)}];
// const props = [hexify('ababab',3), hexify('cdcdcd',3), hexify('efefef',3)];
// const suspense = local && local.filter(db=> !props.some(api => isEqual(api!, db.id!)));
// console.log(suspense);

//----------------------------- test delta logic ----------------------------------//
// type ptype = {
//   filled_size: number,
//   filled_amount: number,
//   average_price: number,
//   fee: number,
//   pnl: number,
// }
// const revised: Partial<ptype> = {
//   filled_size: 0,
//   filled_amount: undefined,
//   average_price: 0,
//   fee: undefined,
//   pnl: 0,
// };
// const props: Partial<ptype> = {
//   filled_size: 0,
//   filled_amount: undefined,
//   average_price: 0,
//   fee: 0,
//   pnl: 0,
// };

// const filled_size = isEqual(props.filled_size!, revised.filled_size!) ? undefined : props.filled_size;
// const filled_amount = isEqual(props.filled_amount!, revised.filled_amount!) ? undefined : props.filled_amount;
// const average_price = isEqual(props.average_price!, revised.average_price!) ? undefined : props.average_price;
// const fee = isEqual(props.fee!, revised.fee!) ? undefined : props.fee;
// const pnl = isEqual(props.pnl!, revised.pnl!) ? undefined : props.pnl;
// const check = {
//   filled_size,
//   filled_amount,
//   average_price,
//   fee,
//   pnl,
// };

// console.log(check);

//----------------------------- cli logs test ----------------------------------//
// const args = process.argv.slice(2); // Remove 'node' executable path and script path
// console.log(`Received arguments: ${args.join(', ')}`);

// const params = `{${args.join(', ')}}`;
// console.log(params);
// if (args.length > 0) {
//   console.log(`The first custom argument is: ${args[0]}`);
// } else {
//   console.log('No custom arguments provided.');
// }

// console.log(new Date("2025-10-08T02:00:00.000Z"), setExpiry("8h", new Date("2025-10-08T02:00:00.000Z")));

//---------------------------------- key check test ----------------------------------------//
// import { hasValues } from 'lib/std.util'
// import { IState } from "db/interfaces/state";
// import * as States from "db/interfaces/state";

// const state = hasValues<Partial<IState>>({status: 'Expired'}) ? 'Yes We Do' : 'No We Do Not';
// console.log(state)

//---------------------------------- transaction test ----------------------------------------//
// import * as db from "db/db.config";
// import { Insert } from "db/query.utils";

// interface itest {
//   value: number | null;
//   dt: Date;
// }

// const run = async () => {
//   const connection = await db.Begin();

//   // Define an array of tasks (promises) to be executed
//   const insertPromises = [
//     Insert<itest>({ value: 1, dt: new Date() }, { table: 'itest', connection }),
//     Insert<itest>({ value: 2, dt: new Date() }, { table: 'itest', connection }),
//     Insert<itest>({ value: 3, dt: new Date() }, { table: 'itest', connection }),
//     Insert<itest>({ value: 4, dt: new Date() }, { table: 'itest', connection }),
// //    Insert<itest>({ value: null, dt: new Date() }, { table: 'itest', connection }),  // error; returns []
//     Insert<itest>({ value: 5, dt: new Date() }, { table: 'itest', connection }),  // error; returns []
//     Insert<itest>({ value: 6, dt: new Date() }, { table: 'itest', connection }),
//     Insert<itest>({ value: 7, dt: new Date() }, { table: 'itest', connection }),
//     Insert<itest>({ value: 8, dt: new Date() }, { table: 'itest', connection }),
//     Insert<itest>({ value: 9, dt: new Date() }, { table: 'itest', connection }),
//   ];

//   try {
//     // Wait for all insert promises to resolve concurrently
//     const results = await Promise.all(insertPromises);

//         // After all promises resolve, check for the specific failure condition
//     if (results.some(result => Object.keys(result).length === 0)) {
//       throw new Error("One or more inserts failed to return data.");
//     }
//     // If all inserts succeed, commit the transaction
//     await db.Commit(connection);
//     console.log("[Info]", `Transaction successful`);
//   } catch (e) {
//     // If any promise rejects, the catch block is executed immediately
//     await db.Rollback(connection);
//     console.log("[Error]", `Transaction failed due to: ${e}`);
//   }
// };

// run();

// //---------------------------------- hex conversion->string test ----------------------------------------//
// import { Select } from "db/query.utils";
// import { IOrder } from "db/interfaces/order";

// const run = async () => {
//   const [order] = await Select<IOrder>({order_id: hexify('c0ffee',6)}, { table: `orders` });
//   console.log(order);

// };

// run();

//---------------------------------- currency/instrument suspension test ----------------------------------------//
// import { Select } from "db/query.utils";
// import { IInstrument } from "db/interfaces/instrument";

// const run = async (props: Partial<IInstrument>) => {
//   // const local = await Select<IInstrument>({ status: `Suspended` }, { table: `vw_instruments`, keys: [{ key: `status`, sign: "<>" }] });
//   // console.log(local);
//   //const instrument = await Select<IInstrument>({instrument: props.instrument} || { base_currency: props.base_currency, quote_currency: props.quote_currency }, { table: `instrument` });
//     const get = props.instrument ? { instrument: props.instrument } : props.symbol ? { symbol: props.symbol } : { base_currency: props.base_currency, quote_currency: props.quote_currency };
//   const instrument = await Select<IInstrument>(get, { table: `instrument` });
//   console.log(instrument);
// };

// run({symbol: 'BTC-USDT'});

//---------------------------------- tpsl_id conversion test ----------------------------------------//
// import { Session,setSession } from "module/session";
// import * as Stops from "db/interfaces/stops";

// setSession({ account: hexify(process.env.account!, 3)! });

// const run = async () => {
//   const stops = await Stops.Fetch({ status: `Expired` });
//   console.log(stops);
//     // {
//     // account: <Buffer 24 59 7a>,
//     // stop_request: <Buffer e4 00 07 e8 91>,
//     // tpsl_id: <Buffer e4 00 07 e8 91>,
//     // client_order_id: 'e40007e891',
//     // instrument_position: <Buffer 62 45 1c 33 17 21>,
//     // ...
//   const cancels = stops && stops.map(({ symbol, tpsl_id }) => ({ instId: symbol, tpslId: BigInt(`0x${hexString(tpsl_id!, 8).slice(4)}`).toString(10) }));
//   console.log(cancels);
// };

// run();

//---------------------------------- tpsl_id conversion test ----------------------------------------//
// import * as StopsAPI from "api/stops";
// import { Select } from "db/query.utils";

// const run = async () => {
//   const stops = await Select<StopsAPI.IStopsAPI>({ status: `Expired` }, { table: `vw_api_stop_requests` });
//   console.log("tpsl_id:", hexify(stops[0].tpslId!, 4));
// };

// run();

// //---------------------------------- stops updateable view  test ----------------------------------------//
// import * as StopsAPI from "api/stops";
// import { Select, Update } from "db/query.utils";

// const run = async () => {
//   const stops = await Update({ tpsl_id: hexify('0009802E',4),state: hexify('E8FCF7') }, { table: `vw_stop_states`, keys: [{ key: `tpsl_id` }] });
//   console.log("Update Result:", stops);
// };

// run();

//---------------------------------- tpsl_id conversion test ----------------------------------------//
// import * as Stops from "db/interfaces/stops";
// import { Select } from "db/query.utils";

// const run = async () => {
// //  const stops = await Select<Stops.IStops>({ status: `Expired` }, { table: `vw_stop_orders`, suffix: `AND tpsl_id IS NOT NULL` });
//   const stops = await Select<Stops.IStops>({ }, { table: `vw_stop_orders` });
//   console.log("tpsl_id:", "1", stops[1].tpsl_id && BigInt(`${hexString(stops[1].tpsl_id!, 8)}`).toString(10));
//   console.log(stops.map(({ symbol, tpsl_id, stop_request }) => ({
//         instId: symbol,
//         tpslId: tpsl_id ? BigInt(hexString(tpsl_id!, 8)).toString(10) : undefined,
//         clientOrderId: stop_request ? hexString(stop_request!,10,``).toUpperCase() : undefined,
//       })));
// };

// run();

//---------------------------------- Session config running Distinct test ----------------------------------------//
// import type { ISession } from "module/session";
// import type { IAccount } from "db/interfaces/account";
// import type { IInstrumentPosition } from "db/interfaces/instrument_position";

// import { setSession, Session, signRequest } from "module/session";

// import * as Accounts from "db/interfaces/account";
// import * as db from "db/query.utils";

// const args = process.argv.slice(2); // get account id
// const config = async (props: Partial<IAccount>) => {
//   const [search] = (await Accounts.Fetch(props)) ?? [undefined];

//   if (search) {
//     const keys: Array<ISession> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
//     const props = keys.find(({ alias }) => alias === search.alias);

//     if (props) {
//       const { api, secret, phrase, rest_api_url, private_wss_url, public_wss_url } = props;
//       setSession({
//         account: search.account,
//         state: "testing",
//         audit_order: "0",
//         audit_stops: "0",
//         api,
//         secret,
//         phrase,
//         rest_api_url,
//         private_wss_url,
//         public_wss_url,
//       });
//     }
//   }
// };

// (async () => {
//   const symbols: Array<Partial<IInstrumentPosition>> = await db.Distinct<IInstrumentPosition>(
//     { account: Session().account, auto_status: "Enabled", symbol: undefined },
//     { table: `vw_instrument_positions`, keys: [{ key: `account` }, { key: `auto_status` }] }
//   );

//   if (symbols.length) {
//     await config({ account: hexify(args[0]) });

//     const method = "GET";
//     const path = `/api/v1/account/batch-leverage-info?instId=${symbols.map((symbols) => symbols.symbol).join()}&marginMode=cross`;
//     const { api, phrase, rest_api_url } = Session();
//     const { sign, timestamp, nonce } = await signRequest(method, path);
//     const headers = {
//       "ACCESS-KEY": api!,
//       "ACCESS-SIGN": sign!,
//       "ACCESS-TIMESTAMP": timestamp!,
//       "ACCESS-NONCE": nonce!,
//       "ACCESS-PASSPHRASE": phrase!,
//       "Content-Type": "application/json",
//     };

//     try {
//       const response = await fetch(rest_api_url!.concat(path), {
//         method,
//         headers,
//       });
//       if (response.ok) {
//         const json = await response.json();
//         console.log(json);
//         return json.data;
//       } else throw new Error(`Position.Active: Response not ok: ${response.status} ${response.statusText}`);
//     } catch (error) {
//       console.log(">> [Error]: Position.Active:", error, method, path, headers);
//       return [];
//     }
//   }
// })();

//---------------------------------- reduce after instrument by account fetch test ----------------------------------------//
// import type { IInstrument } from "db/interfaces/instrument";

// import { config } from "module/session";

// import * as InstrumentAPI from "api/instruments";

// const args = process.argv.slice(2); // get account id

// (async () => {
//   await config({ account: hexify(args[0]) });
//   const symbols = await InstrumentAPI.Fetch();

//   if (symbols && symbols.length) {
//     console.log(`-> Instrument.Position.Import [ ${symbols.length} ]`);

//     const instruments = symbols.reduce<Record<string, Array<Partial<IInstrument>>>>((acc, api) => {
//       if (!acc["exists"]) acc["exists"] = [];
//       if (!acc["missing"]) acc["missing"] = [];

//       acc[api.instrument ? "exists" : "missing"].push(api);
//       return acc;
//     }, {});

//     console.log(instruments['exists']);
//   }
// })();

// const leverages: Array<ILeverageAPI> = [
//   {
//     leverage: "1",
//     marginMode: "cross",
//     instId: "JASMY-USDT",
//     positionSide: "long",
//   },
//   {
//     leverage: "2",
//     marginMode: "cross",
//     instId: "JASMY-USDT",
//     positionSide: "short",
//   },
//   {
//     leverage: "3",
//     marginMode: "cross",
//     instId: "KAS-USDT",
//     positionSide: "long",
//   },
//   {
//     leverage: "4",
//     marginMode: "cross",
//     instId: "KAS-USDT",
//     positionSide: "short",
//   },
//   {
//     leverage: "5",
//     marginMode: "cross",
//     instId: "BRETT-USDT",
//     positionSide: "long",
//   },
//   {
//     leverage: "6",
//     marginMode: "cross",
//     instId: "BRETT-USDT",
//     positionSide: "short",
//   },
//   {
//     leverage: "7",
//     marginMode: "cross",
//     instId: "BTC-USD",
//     positionSide: "long",
//   },
//   {
//     leverage: "8",
//     marginMode: "cross",
//     instId: "BTC-USD",
//     positionSide: "short",
//   },
//   {
//     leverage: "9",
//     marginMode: "cross",
//     instId: "BTC-USDC",
//     positionSide: "long",
//   },
//   {
//     leverage: "10",
//     marginMode: "cross",
//     instId: "BTC-USDC",
//     positionSide: "short",
//   },
//   {
//     leverage: "11",
//     marginMode: "cross",
//     instId: "BTC-USDT",
//     positionSide: "long",
//   },
//   {
//     leverage: "12",
//     marginMode: "cross",
//     instId: "BTC-USDT",
//     positionSide: "short",
//   },
// ];

// const batch = [
//   { symbol: "JASMY-USDT", position: `short` },
//   { symbol: "KAS-USDT", position: `short` },
//   { symbol: "BRETT-USDT", position: `short` },
//   { symbol: "BTC-USD", position: `short` },
//   { symbol: "BTC-USDC", position: `short` },
//   { symbol: "BTC-USDT", position: `short` },
// ];
// (async () => {
//   const leverageLookup: Record<string, string> = leverages.reduce((map, item) => {
//     map[item.instId+item.positionSide] = item.leverage;
//     return map;
//   }, {} as Record<string, string>);

//   return batch.map((auditItem) => {
//     const leverageValue: string = leverageLookup[(auditItem.symbol+auditItem.position)] || "0";
//     console.log(auditItem.symbol, leverageValue);
//   });
// })();

//---------------------------------- instrument position import test ----------------------------------------//
// import * as InstrumentPosition from "api/instrumentPositions";

// const args = process.argv.slice(2); // get account id

// (async () => {
//   await config({ account: hexify(args[0]) });
//   await InstrumentPosition.Import();

// })();

//---------------------------------- Session config get multiple leverage test ----------------------------------------//
// import type { IInstrumentPosition } from "db/interfaces/instrument_position";

// import { config, Session, signRequest } from "module/session";
// import * as db from "db/query.utils";

// const args = process.argv.slice(2); // get account id

// (async () => {
//   const symbols: Array<Partial<IInstrumentPosition>> = await db.Distinct<IInstrumentPosition>(
//     { account: Session().account, auto_status: "Enabled", symbol: undefined },
//     { table: `vw_instrument_positions`, keys: [{ key: `account` }, { key: `auto_status` }] }
//   );

//   if (symbols.length) {
//     await config({ account: hexify(args[0]) });

//     const method = "GET";
//     const path = `/api/v1/account/batch-leverage-info?instId=${symbols.map((symbols) => symbols.symbol).join()}&marginMode=isolated`;
//     const { api, phrase, rest_api_url } = Session();
//     const { sign, timestamp, nonce } = await signRequest(method, path);
//     const headers = {
//       "ACCESS-KEY": api!,
//       "ACCESS-SIGN": sign!,
//       "ACCESS-TIMESTAMP": timestamp!,
//       "ACCESS-NONCE": nonce!,
//       "ACCESS-PASSPHRASE": phrase!,
//       "Content-Type": "application/json",
//     };

//     try {
//       const response = await fetch(rest_api_url!.concat(path), {
//         method,
//         headers,
//       });
//       if (response.ok) {
//         const json = await response.json();
//         console.log(json);
//         return json.data;
//       } else throw new Error(`Position.Active: Response not ok: ${response.status} ${response.statusText}`);
//     } catch (error) {
//       console.log(">> [Error]: Position.Active:", error, method, path, headers);
//       return [];
//     }
//   }
// })();

// //---------------------------------- request search algo test ----------------------------------------//
// import { Select } from "db/query.utils";
// import { IRequest } from "db/interfaces/request";

// import { config } from "module/session";
// import* as Request from "db/interfaces/request";

// const args = process.argv.slice(2); // get account id

// const run = async (symbol: string, position: 'long' | 'short') => {
//   if (symbol && position) {
//     await config({ account: hexify(args[0]) });

//     const request = await Request.Submit({ symbol, position, status: `Pending`});
//     console.log(request);
//   }
// };

// run("XRP-USDT", "short");

//---------------------------------- request search algo test ----------------------------------------//
// import * as InstrumentPositions from "api/instrumentPositions";

// import { config } from "module/session";

// const args = process.argv.slice(2); // get account id

// const run = async () => {
//   await config({ account: hexify(args[0]) });
//   await InstrumentPositions.Import();
// };

// run();

//---------------------------------- json -> csv test ----------------------------------------//
// import * as fs from 'fs';
// import * as path from 'path';

// // Define the interface for the raw data structure
// interface ApiResponse {
//   code: string;
//   msg: string;
//   data: string[][];
// }

// const inputFilePath = path.join(__dirname, 'btc.json');

// function readJsonFile(filePath: string): ApiResponse {
//   try {
//     const jsonString = fs.readFileSync(filePath, 'utf-8');
//     const data: ApiResponse = JSON.parse(jsonString);
//     return data;
//   } catch (error) {
//     console.error("Error reading or parsing JSON file:", error);
//     throw error;
//   }
// }

// function convertJsonToCsv(apiResponse: ApiResponse): string {
//   if (apiResponse.code !== "0" || !apiResponse.data || apiResponse.data.length === 0) {
//     return "";
//   }

//   // Assuming headers based on your previous data
//   const header = "Timestamp,Open,High,Low,Close,Volume,CurrencyVolume,TradeAmount,Flag";
//   const csvRows = apiResponse.data.map(row => row.join(','));
//   const csvString = [header, ...csvRows].join('\n');

//   return csvString;
// }

// const outputFilePath = path.join(__dirname, 'btc.csv');

// function writeCsvFile(filePath: string, csvContent: string): void {
//   try {
//     fs.writeFileSync(filePath, csvContent, 'utf-8');
//     console.log(`Successfully wrote CSV data to ${filePath}`);
//   } catch (error) {
//     console.error("Error writing CSV file:", error);
//     throw error;
//   }
// }

// // Assume the above functions (readJsonFile, convertJsonToCsv, writeCsvFile) are available

// async function processApiFile() {
//     const jsonData = readJsonFile(inputFilePath);
//     const csvContent = convertJsonToCsv(jsonData);

//     if (csvContent) {
//         writeCsvFile(outputFilePath, csvContent);
//     } else {
//         console.log("No data to write to CSV.");
//     }
// }

// processApiFile();

//-------------------------------- candles Import ---------------------------------------//
// import * as Candles from "db/interfaces/candle";
// import * as CandleAPI from "api/candles"
// import { clear } from "lib/app.util";

// // async function fetchBatch() {
// //   const candles = await Candles.Batch({ symbol: 'XRP-USDT', timeframe: "15m", timestamp: 1765094400000, limit: 10 });
// //   console.log("Fetch filtered period:", candles);

// // }

// // fetchBatch();
// async function importCandles() {
//   const symbol=`XRP-USDT`
//   const message = clear({state: `init`, symbol});
//   console.log("In App.Loader for ", { symbol }, "start: ", new Date().toLocaleString());
//   const publish = await CandleAPI.Publish(message);

//   console.log(`-> Import for ${publish?.symbol} complete:`, new Date().toLocaleString());
//   publish?.db && publish.db.insert && console.log(`  # [Info] ${message.symbol}: ${publish.db.insert} candles imported`);
//   publish?.db && publish.db.update && console.log(`  # [Info] ${message.symbol}: ${publish.db.update} candles updated`);

//   process.exit(0);
// }

// importCandles();
// import * as Import from "app/import";

// const account = hexify(process.env.account || process.env.SEED_ACCOUNT || `???`);
// config({ account })
//   .then( async () => {
//     console.log(Session());
//     await Import.importInstruments()
//       .then(() => {
//         console.log("[Info] Import.Instruments: Successfully completed");
//         process.exit(0);
//       })
//       .catch((e) => {
//         console.log("[Error] Import.Instruments: Failed to complete successfully");
//         process.exit(1);
//       });
//   });

// const str1: string = "10"
// const num1: number = 10;

// isEqual(str1,num1) && console.log('Yes they are');

// const null1: string = null;
// const undef1: number = undefined;

// isEqual(str1,null1) && console.log('Yes they are');
// isEqual(str1,undef1) && console.log('Yes they are');
// isEqual(null1,str1) && console.log('Yes they are');
// isEqual(undef1,str1) && console.log('Yes they are');

// isEqual(null1,null1) && console.log('1. Yes they are');
// isEqual(undef1,undef1) && console.log('2. Yes they are');
// isEqual(null1,undef1) && console.log('3. Yes they are');
// isEqual(undef1,null1) && console.log('4. Yes they are');

// //---------------------------------- stops updateable view  test ----------------------------------------//
// import { Update } from "db/query.utils";

// const test1 = { request: hexify("a6d98e3fea24"), base_symbol: "WHOA-1", quote_symbol: "DJJ" };
// const test2 = { request: hexify("a6d98e3fea24"), base_symbol: "WHOA-2", quote_symbol: "DJJ" };
// const test3 = { request: hexify("a6d98e3fea24"), base_symbol: "WHOA-??", quote_symbol: "DJX" };
// const test4 = { request: hexify("06d98e3fea24"), base_symbol: "WHOA-NF", quote_symbol: "DJNF" };

// const run = async () => {
//   const result1 = await Update(test1, { table: `update_test`, keys: [{ key: `request` }] });
//   console.log("Update Result:", result1);
//   const count1 = result1.rows || 0;

//   const result2 = await Promise.all([
//     Update(test2, { table: `update_test`, keys: [{ key: `request` }] }),
//     Update(test1, { table: `update_test`, keys: [{ key: `request` }] }),
//   ]);
//   console.log("Update Result2:", result2);
//   const count2 = result2.filter((res) => res.rows || 0 > 0).length;

//   const result3 = await Promise.all([
//     Update(test3, { table: `update_test`, keys: [{ key: `request`, sign: ">" }], limit: 2 }),
//     Update(test2, { table: `update_test`, keys: [{ key: `request` }] }),
//     Update(test1, { table: `update_test`, keys: [{ key: `request` }] }),
//     Update(test4, { table: `update_test`, keys: [{ key: `request` }] }),
//     Update(test4, { table: `update_test2`, keys: [{ key: `request` }] }),
//     Update({}, { table: `update_test2`, keys: [{ key: `request` }] })
//   ]);
//   console.log("Update Result3:", result3);
//   const count3 = result3.filter((res) => res.rows || 0 > 0).length;

//   //-- finals -- //
//   console.log("// -- final -- //");
//   console.log("Update Count1:", count1);
//   console.log("Update Count2:", count2);
//   console.log("Update Count3:", count3);

// // -- summary -- //
//   console.log("Updates Attempted:", result3.reduce((acc, curr) => acc + (curr.rows || 1), 0));
//   console.log("-> Succeeded:", result3.reduce((acc, curr) => acc + (curr.rows || 0), 0));
//   console.log("-> Not Found:", result3.filter(res => res.category === 'not-found').length);
//   console.log("-> Errors:",    result3.filter(res => res.category === 'error').length);
//   console.log("-> Malformed:", result3.filter(res => res.category === 'null-query').length);

//   console.log("// -- end -- //");

//   process.exit(0);
// };

// run();

//---------------------------------- ipos publish + summary test ----------------------------------------//
// import * as Activity from "db/interfaces/activity";
// import * as Authority from "db/interfaces/authority";
// import * as Broker from "db/interfaces/broker";
// import * as Environment from "db/interfaces/environment";
// import * as Period from "db/interfaces/period";
// import * as References from "db/interfaces/reference";
// import * as Role from "db/interfaces/role";
// import * as RoleAuthority from "db/interfaces/role_authority";
// import * as State from "db/interfaces/state";
// import * as SubjectArea from "db/interfaces/subject_area";
// import * as Positions from "api/positions";
// import type { ICurrency } from "db/interfaces/currency";
// import type { IInstrument } from "db/interfaces/instrument";

// import * as Currency from "db/interfaces/currency";
// import * as InstrumentType from "db/interfaces/instrument_type";
// import * as Instruments from "api/instruments";

// const args = process.argv.slice(2); // get account id

// const run = async () => {
//   await config({ account: hexify(args[0]) });

//   console.log("Session Configured for Account:", Session().account);

//   //-- import positions --//
//   const results = await Positions.Import();
//   console.log("Import Results:", results);

//   //-- import Seed Data --//
//   //const seed = await Promise.all([
//     await Activity.Import();
//     await Authority.Import();
//     await Broker.Import();
//     await Environment.Import();
//     await Period.Import();
//     await Role.Import();
//     await RoleAuthority.Import({status:`Enabled`});
//     await State.Import();
//     await SubjectArea.Import();
//     await References.Import();
//]);

//const results = await InstrumentPositions.Import();
//  const bc: IPublishResult<ICurrency> = (await Currency.Publish({ symbol: undefined }));
//  console.log("Currency Publish Result:", bc);
//  console.log("Import Results:", results);
//  const instrument = await InstrumentType.Publish({ symbol: undefined });
//   const props: Partial<InstrumentType.IInstrumentType> = {
//     instrument_type: "NEVER",
//     description: "This is a test instrument type",
//   };
//   const instrument = await InstrumentType.Publish(props);
//   const result = await InstrumentType.Publish(props);
//   console.log("InstrumentType Publish Result:", result, result.key?.instrument_type);
//   const instrument_type = result.key?.instrument_type
//       ? result.key?.instrument_type
//       : props.instrument_type;
//   console.log("Instrument Publish Result:", instrument_type);
//   process.exit(0);
// };

// run();

//---------------------------------- on one preprocessor (etl before the call) ----------------------------------------//
// export interface IKeyTest {
//   instrument: Uint8Array;
//   detailid: Uint8Array;
//   leverage: string;
//   marginMode: "cross" | "isolated";
//   instId: string;
//   positionSide: TPosition;
// }

// const ipos: IKeyTest = {
//   instrument: hexify("0009802E", 4)!,
//   detailid: hexify("0009802E", 4)!,
//   leverage: "8",
//   marginMode: "cross",
//   instId: "BTC-USD",
//   positionSide: "short",
// };

// type CompositeKey<T> = { [K in keyof T]?: T[K] };

// const CPK_KEYS: (keyof IKeyTest)[] = ["instrument",];
// console.log(compositeKey(ipos, CPK_KEYS));

// const check: CompositeKey<IKeyTest> = { instrument: hexify("0009802E", 4)!, detailid: hexify("0009802E", 4)! };
// const check2: CompositeKey<IKeyTest> = ipos;
// console.log(check2, compositeKey(check2, CPK_KEYS));

//-------------------------------- candles History Import ---------------------------------------//
//import { History } from "api/candles";
// import type { ICandle } from "db/interfaces/candle";
// import * as Candles from "db/interfaces/candle";

// const getHistory = async (props: Partial<ICandle>) => {
//   const history = await Candles.History(props)
// }

// getHistory({symbol: 'XRP-USDT'});

//-------------------------------- candles History Import ---------------------------------------//
// import * as app from "module/session";
// import * as OrderAPI from "api/orders";

// const getHistory = async () => {
//   const account = hexify(args[0] || process.env.SEED_ACCOUNT || `???`);
//   await app.config({ account });
//   console.log(Session());
//   const orders = await OrderAPI.Import();

//   if (orders) {
//     const count402 = orders.filter((req) => req.response.code === 402);
//     const count200 = orders.filter((req) => req.response.code === 200);
// //    console.log(orders.filter((req) => req.response.code != 452 && req.response.code != 402));
//     //   console.log(history.filter((req) => req.response.code != 452 ));
//     console.log("History size:", orders.length, "402s processed:", count402.length, "200s processed:", count200.length);
//     console.log();
//     //  fileWrite('./response.log', history);
//     process.exit(0);
//   }
// };
// const args = process.argv.slice(2); // get account id

// // if (args.length) {
// //   setSession({ account: hexify(args[0]) });

// getHistory();

// import { ApiError } from "api/api.util";
// import { Select } from "db/query.utils";

// export interface IStopType {
//   stoop_type: Uint8Array;
//   source_ref: string;
//   prefix: string;
//   description: string;
// }

// const Types = async (props: ["tp", "sl"]): Promise<Array<Partial<IStopType>> > => {
//   const types = props
//     ? (
//         await Promise.all(
//           props.map((p) => {
//             return Select<IStopType>({ source_ref: p }, { table: `stop_type` });
//           }),
//         )
//       )
//     : [];
//   return types.flat();
// };

// const run = async () => {
//   const types = await Types(["tp", "sl"]);
//   const typeMap = new Map(types.map((t) => [t.source_ref, t]));

//   const tp = typeMap.get("tp");
//   const sl = typeMap.get("sl");

//   console.log(types);
// };

// run();

/**
 * Pending - retrieves all active orders, paginating if count > Session().orders_max_fetch;
 */
// import { IStopsAPI } from "api/stops";
// import { API_GET } from "api/api.util";
// import * as app from "module/session";

// const args = process.argv.slice(2); // get account id

// const Pending = async (): Promise<Array<Partial<IStopsAPI>>> => {
//   const pending: Array<Partial<IStopsAPI>> = [];
//   const limit = Session().orders_max_fetch || 20;

//   let afterId = "0";

//   while (true) {
//     const path = `/api/v1/trade/orders-tpsl-pending?before=${afterId}&limit=${limit}`;

//     try {
//       const result = await API_GET<Array<Partial<IStopsAPI>>>(path, "Stops.Pending");
//       if (result && result.length > 0) {
//         pending.push(...result);
//         afterId = Math.max(...result.map((o) => parseInt(o.tpslId!))).toString();
//       } else break;

//       await delay(1500);
//     } catch (error) {
//       console.error(">> [Error] Stops.Pending: multi-fetch failure from API:", error instanceof Error ? error.message : error);
//       break;
//     }
//   }

//   return pending;
// };

// const run = async () => {
//   const account = hexify(args[0] || process.env.SEED_ACCOUNT || `???`);
//   await app.config({ account });
//   console.log(Session());
//   const pending = await Pending();
//   console.log(pending);
//   process.exit(1);
// };

import * as app from "module/session";
const args = process.argv.slice(2); // get account id
const run = async () => {
  const account = hexify(args[0] || process.env.SEED_ACCOUNT || `???`);
  await app.config({ account }, "XRP-USDT");
};
run();
