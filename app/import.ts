//+---------------------------------------------------------------------------------------+
//|                                                                             import.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition } from "#db";
import type { IMessage } from "#lib/app.util";

import { clear } from "#lib/app.util";
import { Session } from "#module/session";
import { Distinct } from "#db/query.utils";

import { Activity, Authority, Broker, Environment, Period, Reference, RoleAuthority, State, SubjectArea, Role } from "#db";
import { Candles, Instruments, InstrumentPositions, Positions } from "#api";

//+--------------------------------------------------------------------------------------+
//| Imports full-candle history; follows up with a candle refresh;                       |
//+--------------------------------------------------------------------------------------+
export const importCandles = async () => {
  const authorized = await Distinct<IInstrumentPosition>(
    { account: Session().account, auto_status: "Enabled", symbol: undefined, timeframe: undefined },
    { table: `vw_instrument_positions`, keys: [[`account`], [`auto_status`]] },
  );

  console.log(`-> Imports Authorized:`, authorized.data?.map((auth) => auth.symbol).join(","));

  //-- Full candle load/syncronization
  const loadCandles = async () => {
    const promises = (authorized.data || []).map(async (instrument) => {
      const { symbol, timeframe } = instrument;

      if (symbol && timeframe) {
        const startTime = 0;
        const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });

        console.log("In App.Loader for ", { symbol, timeframe, startTime }, "start: ", new Date().toLocaleString());

        return Candles.Import(message, { symbol, timeframe, startTime });
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
    const promises = (authorized.data || []).map(async (instrument) => {
      const { symbol, timeframe } = instrument;
      if (symbol && timeframe) {
        const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });
        return Candles.Publish(message);
      }
    });
    const published = await Promise.all(promises);

    if (published) {
      console.log("In Candles.Publish [API]:", new Date().toLocaleString());
      console.log(`-> Authorized Symbols:`, (authorized.data || []).map((auth) => auth.symbol).join(","));

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
  await Instruments.Import();
  await InstrumentPositions.Import();
  const result = await Positions.Import();
  console.log(result);
};

//+--------------------------------------------------------------------------------------+
//| Installs seed data during initialization of a new database;                          |
//+--------------------------------------------------------------------------------------+
export const importSeed = async () => {
  await SubjectArea.Import();
  await Activity.Import();
  await Authority.Import();
  await Broker.Import();
  await Environment.Import();
  await Period.Import();
  await Reference.Import();
  await Role.Import();
  await State.Import();
  await RoleAuthority.Import({ status: `Enabled` });
};
