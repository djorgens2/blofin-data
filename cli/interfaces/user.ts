/**
 * @module User-Auth-Interface
 * @description State management and credential orchestration for CLI users.
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IUser } from "#db/interfaces/user";
import type { Answers } from "prompts";
import Prompt, { type IOption } from "#cli/modules/Prompts";
import { green, red, yellow, cyan, bold } from "console-log-colors";

import { setState } from "#cli/modules/State";
import { setHeader } from "#cli/modules/Header";
import { getLengths } from "#lib/std.util";
import { Session } from "#module/session";

import * as Users from "#db/interfaces/user";
import * as Roles from "#db/interfaces/role";

interface IUserToken {
  user: Uint8Array;
  username: string;
  title: string;
  role: Uint8Array;
  error: number;
  message: string;
}

/**
 * Internal state for the currently active administrative session.
 */
const userToken: IUserToken = {
  user: Buffer.from([0, 0, 0]),
  username: ``,
  title: ``,
  role: Buffer.from([0, 0, 0]),
  error: 0,
  message: ``,
};

/**
 * Returns the current User Token state.
 */
export const UserToken = () => userToken;

/**
 * Updates the global user session state.
 * @param token - Partial updates for the user token.
 * @param details - Optional debug info for error logging.
 */
export const setUserToken = (token: Partial<IUserToken>, details?: any) => {
  Object.assign(userToken, { ...token });
  details && console.error(token.message, details, Session());
};

/**
 * Internal helper to aggregate role, state, and image data for new/edited users.
 * @internal
 */
const setFields = async <T extends Answers<string>>(props: T) => {
  const roles = await setRole(props);
  const { role, title } = roles!;

  const states = await setState();
  const { state, status } = states!;

  const images = props?.image_url && (await Prompt(["text"], { message: "Edit image?", initial: props?.image_url }));
  const image_url = images?.value ? images.value : ``;

  return { role, title, state, status, image_url };
};

/**
 * Renders a selection prompt to resolve a specific user from the database.
 * @param props - Query filters for fetching users.
 * @returns Object containing the selected user ID and username.
 */
export const setUser = async (props: Partial<IUser>) => {
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

/**
 * Fetches available roles and prompts for selection based on the current user's auth_rank.
 * @internal
 */
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

/**
 * Primary entry point for credential collection. Handles login and user creation.
 * @param newUser - If true, triggers the "Add User" workflow including verification.
 * @param props - Initial properties for the user being processed.
 * @returns Boolean indicating if the credentials were successfully verified or created.
 */
export const setCredentials = async (newUser: boolean = false, props?: Partial<IUser>) => {
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
        const user = await Users.Add({ ...credentials, password });
        const result = await Users.Fetch({ user });
        result ? setUserToken({ ...result, error: 0, message: "Operation successful." }) : setUserToken({ error: 401, message: "Operation failed." });
      }
      return verified;
    }
  }
  setUserToken({ error: 401, message: "Operation canceled." });
  return false;
};

/**
 * Handles password input. In 'verify' mode, forces a dual-entry confirmation loop.
 * @param props - Context including username/email for the login attempt.
 * @returns The entered password and a verification status.
 */
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
    const response = await Prompt(["password"]);

    if (response.password === undefined) {
      // User hit Esc
      return { verified: false, cancelled: true };
    }
    
    const result = await Users.Login({ username, email, password: response.password });
    setUserToken(result);
    return { verified: true };
  }
};

/**
 * Renders a formatted table of all system users.
 *
 * Uses dynamic padding based on content length and color-coded
 * status indicators (Cyan for Enabled, Red for Disabled).
 *
 * @async
 */
export const menuViewUser = async () => {
  setHeader("View Users");

  const users = await Users.Fetch({});

  // Calculate dynamic column widths based on DB content
  const keylen = await getLengths<IUser>(
    {
      username: 16,
      email: 24,
      title: 10,
      status: 12,
      image_url: 24,
      create_time: 12,
      update_time: 12,
      colBuffer: 5,
    },
    users!,
  );

  // Table Header
  console.log(
    `\n✔️ `,
    `${bold("User Name".padEnd(keylen.username, " "))}`,
    `${bold("E-Mail Address".padEnd(keylen.email, " "))}`,
    `${bold("Title".padEnd(keylen.title, " "))}`,
    `${bold("Status".padEnd(keylen.status, " "))}`,
    `${bold("Image Location".padEnd(keylen.image_url, " "))}`,
    `${bold("Created".padEnd(keylen.create_time, " "))}`,
    `${bold("Updated".padEnd(keylen.update_time, " "))}`,
  );

  if (users) {
    for (const user of users) {
      const { username, email, title, status, image_url, create_time, update_time } = user;

      // Status-based color logic
      const statusStyled =
        status === "Enabled"
          ? cyan(status!.padEnd(keylen.status, " "))
          : status === "Disabled"
            ? red(status!.padEnd(keylen.status, " "))
            : yellow(status!.padEnd(keylen.status, " "));

      console.log(
        `${status! === "Enabled" ? "🔹" : "🔸"} `,
        `${username!.padEnd(keylen.username, " ")}`,
        `${email!.padEnd(keylen.email, " ")}`,
        `${title!.padEnd(keylen.title, " ")}`,
        statusStyled,
        `${image_url!.padEnd(keylen.image_url, " ")}`,
        `${create_time!.toLocaleDateString().padEnd(keylen.create_time, " ")}`,
        `${update_time!.toLocaleDateString().padEnd(keylen.update_time, " ")}`,
      );
    }
  }

  console.log(``);
  // Re-render loop control
  const { choice } = await Prompt(["choice"], {
    message: "  ",
    active: "Refresh",
    inactive: "Finished",
    initial: false,
  });
};

/**
 * Orchestrates the creation of a new administrative user.
 * Routes directly to the credential verification/creation logic.
 *
 * @async
 */
export const menuCreateUser = async () => {
  setHeader("Create User");
  await setCredentials(true);
};

/**
 * Entry point for modifying existing user attributes.
 * @todo Implement field-level update logic.
 */
export const menuEditUser = async () => {
  setHeader("Edit User");
};

/**
 * Entry point for administrative removal of user accounts.
 * @todo Implement cascading delete/disable logic.
 */
export const menuDropUser = async () => {
  setHeader("Drop User");
};

/**
 * @default Returns the UserToken state getter.
 */
export default UserToken;
