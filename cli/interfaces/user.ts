//+--------------------------------------------------------------------------------------+
//|                                                                              user.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt, { IOption } from "@cli/modules/Prompts";

import { green, red, yellow, cyan, bold } from "console-log-colors";
import { Answers } from "prompts";

import { setState} from "@cli/modules/State";
import { setHeader } from "@cli/modules/Header";

import * as Users from "@db/interfaces/user";
import * as Roles from "@db/interfaces/role";

interface IUserToken {
  username: string;
  title: string;
  role: Uint8Array;
  error: number;
  message: string;
}

const userToken: IUserToken = { username: ``, title: ``, role: Buffer.from([0, 0, 0]), error: 0, message: `` };
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
//| Retrieves the authorized role assignments in prompt format;                          |
//+--------------------------------------------------------------------------------------+
const setFields = async <T extends Answers<string>>(props: T) => {
  const roles = await setRole(props);
  const { role, title } = roles!;

  const states = await setState(props);
  const { state, status } = states!;

  const images = props?.image_url && (await Prompt(["text"], { message: "Edit image?", initial: props?.image_url }));
  const image_url = images?.value ? images.value : ``;

  return { role, title, state, status, image_url };
};

//+--------------------------------------------------------------------------------------+
//| Retrieves users in prompt format;                                                    |
//+--------------------------------------------------------------------------------------+
export const setUser = async (props: Users.IKeyProps) => {
  const users = await Users.Fetch(props);
  const choices: Array<IOption> = [];

  if (users) {
    users.forEach((option) => {
      choices.push({
        title: option?.username!,
        value: option?.user!,
      });
    });

    const { select } = await Prompt(["select"], { message: "  Who owns the account?", choices });
    const choice = choices.find(({ value }) => value.toString() === select.toString());

    return { user: choice!.value, username: choice!.title };
  }
};

//+--------------------------------------------------------------------------------------+
//| Retrieves the authorized role assignments in prompt format;                          |
//+--------------------------------------------------------------------------------------+
const setRole = async <T extends Answers<string>>(props: T) => {
  const roles = await Roles.Fetch({});
  const choices: Array<IOption> = [];

  if (roles) {
    const userAuth = userToken.title || "Admin";
    const roleAuth = roles.find(({ title }) => title === userAuth);

    if (props?.role) return roles.find(({ role }) => role!.toString() === props.role.toString());
    if (props?.title) return roles.find(({ title }) => title === props.title);

    if (roleAuth) {
      roles.forEach((option) => {
        if (roleAuth.auth_rank! >= option.auth_rank!) {
          choices.push({
            title: option.title!,
            value: option.role!,
          });
        }
      });
      const { select } = await Prompt(["select"], { message: "  Select a Role:", choices });
      const choice = choices.find(({ value }) => value.toString() === select.toString());

      return { role: choice!.value, title: choice!.title };
    }
  }
};

//+--------------------------------------------------------------------------------------+
//| Performs light validation on prompted user credentials; more tightening expected;    |
//+--------------------------------------------------------------------------------------+
export const setCredentials = async (newUser: boolean = false, props?: Partial<Users.IKeyProps>) => {
  const credentials = await Prompt(["username", "email"]);

  let { username, email } = credentials;

  if (username) {
    if (username.indexOf("@") > 0) {
      email = username;
      username = username.slice(0, username.indexOf("@"));
    }

    if (email) {
      const fields = newUser && (await setFields(props!));

      Object.assign(credentials, { username, email, verify: newUser });
      const { password, verified } = await setPassword(credentials);

      if (newUser && verified) {
        Object.assign(credentials, { ...credentials, ...fields });
        const result = await Users.Add({ ...credentials, password });
        setUserToken(result);
      }

      return verified;
    }
  }
  setUserToken({ error: 401, message: "Operation canceled." });
  return false;
};

//+--------------------------------------------------------------------------------------+
//| Password dialogue handler; strong confirmation checks on adds/sets/resets;           |
//+--------------------------------------------------------------------------------------+
export const setPassword = async <T extends Answers<string>>(props: T) => {
  const { username, email } = props;
  if (props.verify)
    do {
      const { password, confirm } = await Prompt(["password", "confirm"]);
      if (password === confirm) return { password, verified: true };

      const { choice } = await Prompt(["choice"], { message: "  Passwords are not the same. Try again?", active: "No", inactive: "Yes", initial: false });
      if (choice) {
        setUserToken({ error: 303, message: "Invalid user credentials." });
        return { verified: false };
      }
    } while (true);
  else {
    const { password } = await Prompt(["password"]);
    const result = await Users.Login({ username, email, password });
    setUserToken(result);
    return { verified: true };
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
export const menuViewUser = async () => {
  setHeader("View Users");
  console.log(
    `\n✔️ `,
    `${bold("User Name".padEnd(16, " "))}`,
    `${bold("E-Mail Address".padEnd(24, " "))}`,
    `${bold("Title".padEnd(10, " "))}`,
    `${bold("Status".padEnd(12, " "))}`,
    `${bold("Image Location".padEnd(36, " "))}`,
    `${bold("Created".padEnd(12, " "))}`,
    `${bold("Updated".padEnd(12, " "))}`
  );
  (await Users.Fetch({})).forEach((user) => {
    const { username, email, title, status, image_url, create_time, update_time } = user;
    console.log(
      `${status! === "Enabled" ? "🔹" : "🔸"}`,
      `${username!.padEnd(16, " ")}`,
      `${email!.padEnd(24, " ")}`,
      `${title!.padEnd(10, " ")}`,
      `${status === "Enabled" ? cyan(status!.padEnd(12, " ")) : status === "Disabled" ? red(status!.padEnd(12, " ")) : yellow(status!.padEnd(12, " "))}`,
      `${image_url!.padEnd(36, " ")}`,
      `${create_time!.toLocaleDateString().padEnd(12, " ")}`,
      `${update_time!.toLocaleDateString().padEnd(12, " ")}`
    );
  });
  console.log(``);
  const { choice } = await Prompt(["choice"], { message: ">", active: "Refresh", inactive: "Finished", initial: false });
};

//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
export const menuCreateUser = async () => {
  setHeader("Create User");
  await setCredentials(true);
};

//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
export const menuEditUser = async () => {
  setHeader("Edit User");
};

//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
export const menuDropUser = async () => {
  setHeader("Drop User");
};

export default UserToken;
