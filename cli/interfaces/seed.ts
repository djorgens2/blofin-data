//+--------------------------------------------------------------------------------------+
//|                                                                              seed.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import * as Activity from "db/interfaces/activity";
import * as Authority from "db/interfaces/authority";
import * as Broker from "db/interfaces/broker";
import * as ContractType from "db/interfaces/contract_type";
import * as Environment from "db/interfaces/environment";
import * as SubjectAreas from "db/interfaces/subject_area";
import * as Period from "db/interfaces/period";
import * as InstrumentType from "db/interfaces/instrument_type";
import * as References from "db/interfaces/reference";
import * as State from "db/interfaces/state";
import * as Roles from "db/interfaces/role";
import * as RoleAuthority from "db/interfaces/role_authority";
import * as Candle from "db/interfaces/candle";
import * as apiInst from "api/instruments";
import * as api from "api/candles";

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
  await RoleAuthority.Import({status: `Enabled`});

  const symbol = `PONKE-USDT`;
  await apiInst.Import();
  await api.Import(clear({ state: `init`, symbol, node: 1 }), { symbol });

  setTimeout(async () => {
    console.log(`Delay`);
    await Candle.Fetch({ symbol, limit: 2}).then((res) => {
      console.log(`Fetch:`, res);
    });
    console.log("-> [info] Seed.Import complete:", new Date().toLocaleString());
    process.exit(0);
  }, 1500);
};
