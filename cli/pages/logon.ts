//+--------------------------------------------------------------------------------------+
//|                                                                             logon.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import Prompt from "@cli/modules/Prompts";
import UserToken from "@cli/interfaces/user";

import { setHeader } from "@cli/modules/Header";
import { setUserToken, setCredentials } from "@cli/interfaces/user";

import * as Initial from "@cli/interfaces/seed";
import * as Users from "@db/interfaces/user";

//+--------------------------------------------------------------------------------------+
//| Login validator and configuration script;                                            |
//+--------------------------------------------------------------------------------------+
export const Logon = async () => {
  const users = await Users.Fetch({ title: "Admin", status: "Enabled" });

  if (users) {
    setUserToken({ error: 500, message: "Please enter your Username and Password." });
    setHeader("Main Login");
    await setCredentials();
  } else {
    setUserToken({ error: 201, message: "This procedure will create an Administrator account." });
    setHeader("Application Setup");

    const { choice } = await Prompt(["choice"], { message: "Administrator account not found. Create one now?", active: "Yes", inactive: "No", initial: true });

    if (choice) {
//      await Initial.Import();
      if (await setCredentials(true, { title: "Admin", status: "Enabled" })) {
        setUserToken({ error: 101, message: "User added. Application restart required." });
      } else setUserToken({ error: 401, message: "Operation canceled." });

      setHeader(" Application Restart Required");
      process.exit(UserToken().error);
    }
  }
};
