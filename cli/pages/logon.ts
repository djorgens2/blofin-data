//+--------------------------------------------------------------------------------------+
//|                                                                             logon.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt from "@cli/modules/Prompts";
import UserToken from "@cli/interfaces/user";

import { setHeader } from "@cli/modules/Header";
import { setUserToken, setCredentials, setPassword } from "@cli/interfaces/user";

import * as Users from "@db/interfaces/user";

//+--------------------------------------------------------------------------------------+
//| Login validator and configuration script;                                            |
//+--------------------------------------------------------------------------------------+
export const Logon = async () => {
  const { total_users } = await Users.Count({ title: "Admin", status: "Enabled" });

  if (total_users! > 0) {
    setUserToken({ error: 500, message: "Please enter your Username and Password." });
    setHeader("Main Login");

    const result = await Prompt(["username", "email", "password"]);
    const props = setCredentials(result);
    const { username, role, title, error, message } = await Users.Login(props);

    setUserToken({ username, title, role, error, message });
  } else {
    setUserToken({ error: 201, message: "This procedure will create an Administrator account." });
    setHeader("Application Setup");

    const create = await Prompt(["choice"], { message: "Administrator account not found. Create one now?", active: "Yes", inactive: "No", initial: true });
    const result = await Prompt(["username", "email"]);
    const props = setCredentials(result);
    const { password, verified } = await setPassword({ ...props, verify: true });

    if (verified) {
      await Users.Add({ ...props, password, title: "Admin", status: "Enabled" });
      setUserToken({ error: 101, message: "User added. Application restart required." });
    } else setUserToken({ error: 401, message: "Operation canceled." });

    setHeader(" Application Restart Required");
    process.exit(UserToken().error);
  }
};
