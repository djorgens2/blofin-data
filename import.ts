//+---------------------------------------------------------------------------------------+
//|                                                                             import.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { clear, IMessage } from "lib/app.util";
import { hexify } from "lib/crypto.util";
import { Session, config } from "module/session";

import * as Activity from "db/interfaces/activity";
import * as Authority from "db/interfaces/authority";
import * as Broker from "db/interfaces/broker";
import * as ContractType from "db/interfaces/contract_type";
import * as Environment from "db/interfaces/environment";
import * as InstrumentPeriod from "db/interfaces/instrument_period";
import * as InstrumentType from "db/interfaces/instrument_type";
import * as Period from "db/interfaces/period";
import * as References from "db/interfaces/reference";
import * as RoleAuthority from "db/interfaces/role_authority";
import * as State from "db/interfaces/state";
import * as SubjectAreas from "db/interfaces/subject_area";
import * as Roles from "db/interfaces/role";

import * as CandleAPI from "api/candles";
import * as InstrumentAPI from "api/instruments";
import * as InstrumentPositionAPI from "api/instrumentPositions";
import * as db from "db/query.utils";

//+--------------------------------------------------------------------------------------+
//| Installs seed data during initialization of a new database;                          |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
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
  await InstrumentAPI.Import();
  await InstrumentPositionAPI.Import();
  await InstrumentPeriod.Import();

  const authorized: Array<Partial<IInstrumentPosition>> = await db.Distinct<IInstrumentPosition>(
    { account, auto_status: "Enabled", symbol: undefined, timeframe: undefined },
    { table: `vw_instrument_positions`, keys: [{ key: `account` }, { key: `auto_status` }] }
  );

  console.log(`-> Imports Authorized:`, authorized.map((auth) => auth.symbol).join(","));

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

  //-------------------------------- candles Import ---------------------------------------//
  const importCandles = async () => {
    const promises = authorized.map(async (instrument) => {
    const { symbol, timeframe } = instrument;

    if (symbol && timeframe) {
      const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });
      return CandleAPI.Publish(clear(message));
    }});
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

  setInterval(async () => {
    await importCandles();
  }, 5000);
};

const account = hexify(process.env.account || process.env.SEED_ACCOUNT || `???`);
config({ account }).then(() => {
  console.log(Session().Log(true));

}).finally(() => {
  Import();
});
