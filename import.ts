//+---------------------------------------------------------------------------------------+
//|                                                                             import.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IInstrumentPosition } from "#db";
import type { IMessage } from "#lib/app.util";

import { clear } from "#lib/app.util";
import { hexify } from "#lib/crypto.util";
import { Session, config } from "#module/session";

import { Activity, Authority, Broker, Environment, InstrumentPeriod, Period, Reference, RoleAuthority, State, SubjectArea, Role } from "#db";
import { Candles, Instruments, InstrumentPositions } from "#api";

import * as db from "#db/query.utils";

//+--------------------------------------------------------------------------------------+
//| Installs seed data during initialization of a new database;                          |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
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
  await Instruments.Import();
  await InstrumentPositions.Import();
  await InstrumentPeriod.Import();

  const authorized= await db.Distinct<IInstrumentPosition>(
    { account, auto_status: "Enabled", symbol: undefined, timeframe: undefined },
    { table: `vw_instrument_positions`, keys: [[`account`], [`auto_status`]] },
  );

  console.log(`-> Imports Authorized:`, authorized.data?.map((auth) => auth.symbol).join(","));

  const promises = (authorized.data || []).map(async (instrument) => {
    const { symbol, timeframe } = instrument;

    if (!symbol || !timeframe) return undefined;

      const startTime = 0;
      const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });

      console.log("In App.Loader for ", { symbol, timeframe, startTime }, "start: ", new Date().toLocaleString());

      return Candles.Import(message, { symbol, timeframe, startTime });
    }
  );
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
    const promises = (authorized.data || []).map(async (instrument) => {
      const { symbol, timeframe } = instrument;

      if (symbol && timeframe) {
        const message: IMessage = clear({ state: "init", account: Session().account!, symbol, timeframe });
        return Candles.Publish(clear(message));
      }
    });
    const published = await Promise.all(promises);

    if (published) {
      console.log("In Candles.Publish [API]:", new Date().toLocaleString());
      console.log(`-> Authorized Symbols:`, authorized.data?.map((auth) => auth.symbol).join(","));

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
config({ account }, "import").then(() => {
  console.log(Session().Log(true));
  Import();
});
