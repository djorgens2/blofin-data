//+---------------------------------------------------------------------------------------+
//|                                                                             import.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition } from "db/interfaces/instrument_position";
import type { IMessage } from "lib/app.util";

import { clear } from "lib/app.util";
import { Session } from "module/session";
import { Distinct } from "db/query.utils";

import * as Activity from "db/interfaces/activity";
import * as Authority from "db/interfaces/authority";
import * as Broker from "db/interfaces/broker";
import * as Environment from "db/interfaces/environment";
import * as Period from "db/interfaces/period";
import * as References from "db/interfaces/reference";
import * as RoleAuthority from "db/interfaces/role_authority";
import * as State from "db/interfaces/state";
import * as SubjectAreas from "db/interfaces/subject_area";
import * as Roles from "db/interfaces/role";

import * as CandleAPI from "api/candles";
import * as OrderAPI from "api/orders";
import * as InstrumentAPI from "api/instruments";
import * as InstrumentPositionAPI from "api/instrumentPositions";
import * as PositionsAPI from "api/positions";

//+--------------------------------------------------------------------------------------+
//| Imports full-order/stops history; follows up with a order/stops refresh;             |
//+--------------------------------------------------------------------------------------+
export const importOrders = async () => {
  console.log(`In Import Orders for account ${Session().alias}`);

  const results = await OrderAPI.Import();

};

//+--------------------------------------------------------------------------------------+
//| Imports full-candle history; follows up with a candle refresh;                       |
//+--------------------------------------------------------------------------------------+
export const importCandles = async () => {
  const authorized: Array<Partial<IInstrumentPosition>> = await Distinct<IInstrumentPosition>(
    { account: Session().account, auto_status: "Enabled", symbol: undefined, timeframe: undefined },
    { table: `vw_instrument_positions`, keys: [{ key: `account` }, { key: `auto_status` }] }
  );

  console.log(`-> Imports Authorized:`, authorized.map((auth) => auth.symbol).join(","));

  //-- Full candle load/syncronization
  const loadCandles = async () => {
    const promises = authorized.map(async (instrument) => {
      const { symbol, timeframe } = instrument;

      if (symbol && timeframe) {
        const startTime = 0;
        const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });

        console.log("In App.Loader for ", { symbol, timeframe, startTime }, "start: ", new Date().toLocaleString());

        return CandleAPI.Import(message, { symbol, timeframe, startTime });
      }
    });
    const published = await Promise.all(promises);

    published.forEach((message) => {
      if (message?.db) {
        console.log(`-> Import for ${message.symbol} complete:`, new Date().toLocaleString());
        message.db.insert && console.log(`   # [Info] ${message.symbol}: ${message.db.insert} candles imported`);
        message.db.update && console.log(`   # [Info] ${message.symbol}: ${message.db.update} candles updated`);
      }
    });
  };

  //-- Refresh (bring current) candles following a full import;
  const refreshCandles = async () => {
    const promises = authorized.map(async (instrument) => {
      const { symbol, timeframe } = instrument;
      if (symbol && timeframe) {
        const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });
        return CandleAPI.Publish(message);
      }
    });
    const published = await Promise.all(promises);

    if (published) {
      console.log("In Candles.Publish [API]:", new Date().toLocaleString());
      console.log(`-> Authorized Symbols:`, authorized.map((auth) => auth.symbol).join(","));

      published.forEach((message) => {
        if (message?.db) {
          message.db.insert && console.log(`   # [Info] ${message.symbol}: ${message.db.insert} candles imported`);
          message.db.update && console.log(`   # [Info] ${message.symbol}: ${message.db.update} candles updated`);
        }
      });
    }
  };

  await loadCandles();
  await refreshCandles();
};

//+--------------------------------------------------------------------------------------+
//| Installs seed data during initialization of a new database;                          |
//+--------------------------------------------------------------------------------------+
export const importInstruments = async () => {
  await InstrumentAPI.Import();
  await InstrumentPositionAPI.Import();
  await PositionsAPI.Import();
};

//+--------------------------------------------------------------------------------------+
//| Installs seed data during initialization of a new database;                          |
//+--------------------------------------------------------------------------------------+
export const importSeed = async () => {
  await SubjectAreas.Import();
  await Activity.Import();
  await Authority.Import();
  await Broker.Import();
  await Environment.Import();
  await Period.Import();
  await References.Import();
  await Roles.Import();
  await State.Import();
  await RoleAuthority.Import({ status: `Enabled` });
};
