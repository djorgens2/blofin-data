/**
 * @module CLI-Entry
 * @description Local Command Bridge for Database-driven Orchestration.
 *
 * Primary Purpose: Administrative management of Users, API Keys, and
 * System Configurations. This module acts as the 'Control Plane',
 * writing directives to the DB which are then executed by autonomous
 * Watchdog processes.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import UserToken, { setUserToken } from "#cli/interfaces/user";
import { setHeader } from "#cli/modules/Header";
import { Menu } from "#cli/pages/menu";
import { Logon } from "#cli/pages/logon";
import { Log } from "#lib/log.util";
import { JobControl } from "#db";

/**
 * Main Administrative Loop
 * Synchronously handles User authentication (Logon) and administrative navigation (Menu).
 *
 * @note This CLI does NOT connect to the Blofin API. It manages local
 * persistence state to trigger external Watchdog actions.
 */
const start = async () => {
  try {
    if (process.argv.includes("--reboot")) JobControl.Reboot();

    // 1. Authenticate against local DB (Authority/User tables)
    await Logon();

    const _user = UserToken();

    // 2. Validate Session State
    // If UserToken signals an error (e.g., invalid local credentials),
    // we block entry and terminate.
    if (_user.error) {
      setUserToken({ error: 402, message: "Invalid user credentials, login declined" });
      setHeader("Unauthorized Access");
      process.exit(1);
    }

    // 3. Enter Admin Menu
    // Navigation for adding users, updating keys, and configuring 'config' vertical rows.
    await Menu();
  } catch (err) {
    Log().error(">> [CRITICAL] CLI Administrative Error:", err);
    process.exit(1);
  }
};

//-- Start the Bridge --//
start();
