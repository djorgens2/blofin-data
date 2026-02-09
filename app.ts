//+------------------------------------------------------------------+
//|                                                           app.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Log, Session, config } from "module/session";
import { hexify } from "lib/crypto.util";
import { CMain } from "app/main";
import { importCandles, importInstruments, importSeed } from "app/import";

import * as PositionsAPI from "api/positions";
import * as OrderAPI from "api/orders";
import * as StopsAPI from "api/stops";

const initialize = async () => {
  await importSeed();

  const results = await Promise.all([importInstruments(), importCandles(), PositionsAPI.Import(), OrderAPI.Import(), StopsAPI.Import()]);

  setTimeout(async () => {
    console.log("[Info] Application.Initialization finished:", new Date().toLocaleString());

    const app = new CMain();
    app.Start();
  }, 1500);
};

const account = hexify(process.env.account || process.env.SEED_ACCOUNT || `???`);
config({ account }).then(() => {
  console.log("[Info] Application.Initialization start:", new Date().toLocaleString());
  console.log(`-> Active.Session:`, Session().Log());
  console.log(`-> Log.Config:`, Log());

  initialize();
});
