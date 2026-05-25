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
import type { ILogger } from "#lib/log.util";

import { withSystem, routeLogs} from "#lib/log.util" 
import { Logon } from "#cli/pages/logon";
import { setHeader } from "#cli/modules/Header";
import { Select, Loader } from "#db";
import { CMain } from "#app/main";
import { SC } from "#api/lexicon";
import UserToken, { withUser } from "#cli/interfaces/user";

const context = "App.Startup";
/**
 * @function Authorize
 * @description Handles both Interactive Logon and Automated Bypass.
 */
const Authorize = async (log: ILogger) => {
  const { username, title } = UserToken();
  if (username && title) return;

  // 1. Detect Environment (Terminal vs Service)
  const isInteractive = process.stdin.isTTY;

  try {
    if (isInteractive) {
      log.info("Interactive Terminal Detected. Awaiting Credentials...");
      await Logon(); // Triggers the blocking CLI prompt
    } else {
      log.warn("Headless Environment Detected. Attempting Automated Bypass...", SC.PARTIAL_SYNC);

      // Reach for the "Secret Pocket" credentials
      const autoUser = process.env.AUTO_AUTH_USER;
      const autoPass = process.env.AUTO_AUTH_PASS;

      if (!autoUser || !autoPass) {
        log.error("Automated Bypass Failed: Missing Secret Credentials", SC.INVALID_SESSION);
        process.exit(1);
      }

      // Perform a silent authentication against the same Logon logic
      // await Logon({ username: autoUser, password: autoPass, silent: true });
    }

    if (UserToken().error) {
      setHeader(`Unauthorized Access`);
      log.error(`Authorization Failed: ${UserToken().message}`, SC.INVALID_SESSION);
      process.exit(1);
    }

    log.success(`Identity Verified: ${UserToken().username}`, SC.OK);
  } catch (err) {
    log.error("Startup Security Breach", SC.UPSERT_FAIL, err);
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
/**
 * @function Initialize
 * @description Spawns autonomous Papa Hubs for authorized user accounts.
 */
const Initialize = async () => {
  return withUser(context, async (log, user) => {
    
    log.info(`Querying authorized accounts for: ${user.username}`);

    const accounts = await Select<IUserAccounts>(
      { user: user.user, auth_status: "Authorized" }, 
      { table: `vw_user_accounts` }
    );

    if (!accounts.success || !accounts.data?.length) {
      log.error(`No Authorized Accounts found. Check permissions.`, SC.NOT_FOUND);
      return [];
    }

    accounts.data.forEach(({ account, alias }) => {
      log.success(`Launching Process Master: ${alias}`, SC.OK);
      const app = new CMain(account);
      app.Start();
    });

    return accounts.data;
  });
};

/**
 * Application Self-Invoking Entry Point
 * @description
 * Verifies user credentials against any (existing) user token (in memory); launches app on successful logon;
 */
withSystem(context, async (log) => {
  // A. Authenticate (Terminal or Auto)
  await Authorize(log);

  // B. redirect syslogs to persistent logfile
  routeLogs(context);

  // C. Verify Seed data (while still in the 'Boot' log context)
  await Loader("../db/seed/", "Seed", log);

  // D. Launch Papa Hubs (Now fully detached and logging to file)
  await Initialize();
});
