//+--------------------------------------------------------------------------------------+
//|                                                                               cli.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import UserToken from "cli/interfaces/user";

import { setHeader } from "cli/modules/Header";
import { Menu } from "cli/pages/menu";
import { Logon } from "cli/pages/logon";

import dotenv from "dotenv";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

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
