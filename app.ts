//+------------------------------------------------------------------+
//|                                                           app.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { Session, config } from "module/session";
import { hexify } from "lib/crypto.util";
import { CMain } from "app/main";
import { importCandles, importInstruments, importSeed } from "app/import";

const initialize = async () => {
  await importSeed();
  await importInstruments();
  await importCandles();

  setTimeout(async () => {
    console.log(">> [Info] Application.Initialization finished:", new Date().toLocaleString());

    const app = new CMain();
    app.Start();
  }, 1500);
};

const account = hexify(process.env.account || process.env.SEED_ACCOUNT || `???`);
config({ account }).then(() => {
  console.log(">> [Info] Application.Initialization start:", new Date().toLocaleString());
  console.log(`-> Active Session:`, Session());

  initialize();
});
