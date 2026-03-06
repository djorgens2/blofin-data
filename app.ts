/**
 * @file app.ts
 * @module ApplicationEntry
 * @description
 * Administrative Bootstrapper. Handles CLI authentication and
 * dispatches detached Papa Hub processes for enabled accounts.
 *
 * DESIGN PHILOSOPHY:
 * Operates as a "Launch-and-Detach" supervisor. Once credentials
 * are verified, it spawns autonomous Papa Hubs and exits,
 * ensuring no single point of failure at the CLI level.
 *
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IUserAccounts } from "#db/types";
import { Logon } from "#cli/pages/logon";
import { setHeader } from "#cli/modules/Header";
import { Select } from "#db";
import { CMain } from "#app/main";
import { Log } from "#lib/log.util";
//import { fork } from "child_process";
//import { hexString } from "#lib/std.util";
import UserToken from "#cli/interfaces/user";

/**
 * @function Connect
 * @description Interactive CLI User Authentication.
 */
const Connect = async () => {
  const { username, title } = UserToken();

  if (username && title) return;

  try {
    // 1. Authenticate against local DB (Authority/User tables)
    await Logon();

    // 2. Verify user credentials; if UserToken signals an error, we block entry and terminate.
    if (UserToken().error) {
      setHeader(`Unauthorized Access`);
      process.exit(1);
    }
  } catch (err) {
    setHeader(">> [CRITICAL] CLI Administrative Error");
    Log().error(`\n\n` + err);
    process.exit(1);
  }
};

/**
 * @function Initialize
 * @description
 * 1. Queries all 'Enabled' accounts within the logged users' purview;
 * 2. Spawns a detached Account-specific process for each.
 * 3. Hands off the verified UserToken for administrative persistence.
 */
const Initialize = async () => {
  const accounts = await Select<IUserAccounts>({ status: "Enabled", auth_status: "Enabled" }, { table: `vw_user_accounts` });

  if (!accounts.success || !accounts.data?.length) {
    Log().error(`[Error] App.Initialize: No Authorized Accounts to operate; check your permissions`);
    return;
  }

  // Inside Grand-Papa
  accounts.data.forEach(({ account }) => {
    const app = new CMain(account); // Born with a Passport
    app.Start();
  });
};

/**
 * Application Self-Invoking Entry Point
 * @description
 * Connect - verifies user credentials against any (existing) user token (in memory); launches app on successful logon;
 */
try {
  Connect().then(async () => Initialize());
} catch (error) {
  Log().error("[Fatal] Bootstrap aborted.", error);
}
