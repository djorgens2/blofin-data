//+------------------------------------------------------------------+
//|                                                           app.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
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
import * as Instruments from "api/instruments";

import { CMain } from "app/main";

console.log(">> [info] Application.Initialization start:", new Date().toLocaleString());

const initialize = async () => {
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

  setTimeout(async () => {
    console.log("-> [info] Application.Initialization finished:", new Date().toLocaleString());

    const app = new CMain();
    app.Start("Blofin Demo");
  }, 1500);
};

initialize();

