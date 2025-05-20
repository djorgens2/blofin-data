//+--------------------------------------------------------------------------------------+
//|                                                                              User.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt from "@cli/modules/Prompts";
import { Answers } from "prompts";
import * as Users from "@db/interfaces/user";

interface IUserToken {
  username: string;
  title: string;
  role: Uint8Array;
  error: number;
  message: string;
}

export const userToken: IUserToken = { username: ``, title: ``, role: Buffer.from([0, 0, 0]), error: 0, message: `` };
export const UserToken = () => {
  return userToken;
};

//+--------------------------------------------------------------------------------------+
//| Sets logged user token values;                                                       |
//+--------------------------------------------------------------------------------------+
export const setUserToken = (token: Partial<IUserToken>) => {
  Object.assign(userToken, { ...token });
};

//+--------------------------------------------------------------------------------------+
//| Performs light validation on prompted user credentials; more tightening expected;    |
//+--------------------------------------------------------------------------------------+
export const setCredentials = <T extends Answers<string>>(props: T) => {
  let { username, email, password } = props;

  if (username.indexOf("@") > 0) {
    email = username;
    username = username.slice(0, username.indexOf("@"));
  }
  return { username, email, password };
};

//+--------------------------------------------------------------------------------------+
//| Password dialogue handler; strong confirmation checks on adds/sets/resets;           |
//+--------------------------------------------------------------------------------------+
export const setPassword = async (props: { username: string; email: string; verify: boolean }) => {
  const { username, email, verify } = props;

  if (verify)
    do {
      const { password, confirm } = await Prompt(["password", "confirm"]);
      if (password === confirm) return { password, verified: true };

      const { choice } = await Prompt(["choice"], { message: "Passwords are not the same. Try again?", active: "No", inactive: "Yes", initial: false });
      if (choice) {
        setUserToken({ error: 303, message: "Invalid user credentials." });
        return { password, verified: false };
      }
    } while (true);
  else {
    const { password } = await Prompt(["password"]);
    const result = await Users.Login({ username, email, password });
    setUserToken(result);

    return { result };
  }
};

export default UserToken;
