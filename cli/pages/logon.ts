/**
 * @module Logon-Page
 * @description The Administrative Entry and System Bootstrapper.
 * 
 * Orchestrates a two-track authentication lifecycle:
 * 1. Verification: If 'Admin' accounts exist, triggers credential collection.
 * 2. Bootstrapping: If no 'Admin' is found, triggers a recursive setup 
 *    flow to initialize the primary administrator.
 * 
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import Prompt from "#cli/modules/Prompts";
import UserToken, { setUserToken, setCredentials } from "#cli/interfaces/user";
import { setHeader } from "#cli/modules/Header";
import { User } from "#db";

/**
 * Executes the Logon or Setup lifecycle.
 * 
 * Performs a preemptive `User.Fetch` to determine system state.
 * If users exist: Calls `setCredentials` for local DB hashing/verification.
 * If users are missing: Initiates the Admin Creation workflow and exits.
 * 
 * @async
 * @returns {Promise<void>}
 */
export const Logon = async (): Promise<void> => {
  // Pre-flight check: Do we have a 'Command Bridge' pilot yet?
  const users = await User.Fetch({ title: "Admin", status: "Enabled" });

  if (users) {
    // Normal Flow: Credentials verified at the DB layer
    setUserToken({ error: 500, message: "Please enter your Username and Password." });
    setHeader("Main Login"); // Clears terminal and renders ASCII frame
    await setCredentials();
  } else {
    // Bootstrap Flow: Database is empty/new
    setUserToken({ error: 201, message: "This procedure will create an Administrator account." });
    setHeader("Application Setup");

    const { choice } = await Prompt(["choice"], { 
      message: "Administrator account not found. Create one now?", 
      active: "Yes", 
      inactive: "No", 
      initial: true 
    });

    if (choice) {
      // Recursive Create-and-Exit pattern
      const success = await setCredentials(true, { title: "Admin", status: "Enabled" });
      
      if (success) {
        setUserToken({ error: 101, message: "User added. Application restart required." });
      } else {
        setUserToken({ error: 401, message: "Operation canceled." });
      }

      setHeader(" Application Restart Required");
      process.exit(UserToken().error);
    }
  }
};
