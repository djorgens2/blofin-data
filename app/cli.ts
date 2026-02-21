//+--------------------------------------------------------------------------------------+
//|                                                                               cli.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import UserToken from "#cli/interfaces/user";

import { setHeader } from "#cli/modules/Header";
import { Menu } from "#cli/pages/menu";
import { Logon } from "#cli/pages/logon";

//+--------------------------------------------------------------------------------------+
//| Main application loop;                                                               |
//+--------------------------------------------------------------------------------------+
const start = async () => {
  do {
    await Logon();
    UserToken().error ? setHeader("Error") : await Menu();
    process.exit(UserToken().error);
  } while (true);
};

//--  start me up --//
start();
