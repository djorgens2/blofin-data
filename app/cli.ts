//+--------------------------------------------------------------------------------------+
//|                                                                               cli.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import UserToken from "@cli/interfaces/user";

import { setHeader } from "@cli/modules/Header";
import { Menu } from "@cli/pages/menu";
import { Logon } from "@cli/pages/logon";

//+--------------------------------------------------------------------------------------+
//| Main application loop;                                                               |
//+--------------------------------------------------------------------------------------+
const start = async () => {
  do {
    await Logon();
    UserToken().error === 0 ? await Menu() : setHeader("Error");
    process.exit(UserToken().error);
  } while (true);
};

//--  start me up --//
start();
