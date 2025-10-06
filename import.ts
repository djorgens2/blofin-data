//+---------------------------------------------------------------------------------------+
//|                                                                             import.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { ICandle } from "db/interfaces/candle";

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

import * as Candles from "api/candles";
import * as Instruments from "api/instruments";

import { clear } from "lib/app.util";

//+--------------------------------------------------------------------------------------+
//| Installs seed data during initialization of a new database;                          |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  await SubjectAreas.Import();
  await Activity.Import();
  await Authority.Import();
  await Broker.Import();
  await ContractType.Import();
  await Environment.Import();
  await InstrumentType.Import();
  await Period.Import();
  await References.Import();
  await Roles.Import();
  await State.Import();
  await RoleAuthority.Import({ status: `Enabled` });
  await Instruments.Import();

  //-------------------------------- candles Import ---------------------------------------//
  const importCandles = async () => {
    const instruments = await InstrumentPeriod.Fetch({ active_collection: true });

    if (instruments) {
      console.log("In Candles.Import [API]:", new Date().toLocaleString());
      console.log("-> [Info] Importing:", instruments.map((i) => i.symbol).join(", "));
      for (const local of instruments) await Candles.Import(clear({ state: `init`, symbol: local.symbol!, node: 1 }), { symbol: local.symbol! });
      console.log("-> [info] Candles.Import complete:", new Date().toLocaleString());
    }
  };

  setInterval(async () => {
    await importCandles();
  }, 5000);
};

Import();
