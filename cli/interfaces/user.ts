//+--------------------------------------------------------------------------------------+
//|                                                                              User.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt from "@cli/modules/Prompts";
import { Answers } from "prompts";
import * as Users from "@db/interfaces/user";
import { setHeader } from "@cli/modules/Header";
import { green, red, yellow, cyan, bold } from "console-log-colors";

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

export const menuViewUser = async () => {
  setHeader("View Users");
  console.log(
    `\n✔️`,
    `${bold("User Name".padEnd(16, " "))}`,
    `${bold("E-Mail Address".padEnd(24, " "))}`,
    `${bold("Title".padEnd(10, " "))}`,
    `${bold("Status".padEnd(12, " "))}`,
    `${bold("Image Location".padEnd(36," "))}`,
    `${bold("Created".padEnd(12, " "))}`,
    `${bold("Updated".padEnd(12, " "))}`
  );
  (await Users.Fetch({})).forEach((user) => {
    const { username, email, title, status, image_url, create_time, update_time } = user;
    console.log(
      `${status! === 'Enabled' ? '🔹' : '🔸'}`,
      `${username!.padEnd(16, " ")}`,
      `${email!.padEnd(24, " ")}`,
      `${title!.padEnd(10, " ")}`,
      `${status === 'Enabled'? cyan(status!.padEnd(12, " ")) : status === 'Disabled' ? red(status!.padEnd(12, " ")) : yellow(status!.padEnd(12, " "))}`,
      `${image_url!.padEnd(36, " ")}`,
      `${create_time!.toLocaleDateString().padEnd(12, " ")}`,
      `${update_time!.toLocaleDateString().padEnd(12, " ")}`
    );
  });
  console.log(``);
  const { choice } = await Prompt(["choice"], { message: ">", active: "Refresh", inactive: "Finished", initial: false });
};

export const menuCreateUser = async () => {
  setHeader("Create User");
};
export const menuEditUser = async () => {
  setHeader("Edit User");
};
export const menuDropUser = async () => {
  setHeader("Drop User");
};
export default UserToken;
