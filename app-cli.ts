import prompts from "prompts";

import type { IBroker } from "@db/interfaces/broker";
import type { IRole } from "@db/interfaces/role";
import type { IUser } from "@db/interfaces/user";

import { hexify } from "./lib/crypto.util";
import { color, log, red, green, cyan, yellow } from "console-log-colors";

import * as Broker from "@db/interfaces/broker";
import * as Role from "@db/interfaces/role";
import * as User from "@db/interfaces/user";
import * as Action from "@db/interfaces/activity";
import * as Subject from "./db/interfaces/subject";

interface IOption {
  title: string;
  value: Uint8Array;
  menu: Array<IOption>;
}

interface PromptOptions {
  type: "text" | "select" | "multiselect" | "number" | "confirm" | "toggle" | "password";
  name: string;
  message: string;
  initial?: boolean;
  active?: string;
  inactive?: string;
  choices?: Array<IOption>;
}

async function runPrompt(options: PromptOptions[]) {
  const response = await prompts(options);
  return response;
}

const choice = (message: string) => {
  const option: PromptOptions[] = [
    {
      type: "toggle",
      name: "value",
      message,
      active: "yes",
      inactive: "no",
      initial: true,
    },
  ];
  return option;
};

const loginOptions = () => {
  const option: PromptOptions[] = [
    {
      type: "text",
      name: "username",
      message: "Username:",
    },
    // {
    //   type: (prev: PromptOptions, values: PromptValues): PromptType | null => {
    //     if (values.username.indexOf("@")) {
    //         console.log(values)
    //       return null;
    //     }
    //     return "text";
    //   },
    //   name: "email",
    //   message: 'E-mail::',
    // },
    {
      type: "text",
      name: "email",
      message: "E-mail:",
    },
    {
      type: "password",
      name: "password",
      message: "Password:",
    },
  ];
  return option;
};

const confirmPassword = () => {
  const option: PromptOptions[] = [
    {
      type: "password",
      name: "password",
      message: "Confirm password:",
    },
  ];
  return option;
};

const selectOptions = (choices: Array<IOption>, username: string) => {
  console.clear();
  console.log("Logged in:", new Date().toLocaleDateString(), "User:", green(username));

  const option: PromptOptions[] = [
    {
      type: "select",
      name: "response",
      message: "Select an option:",
      choices,
    },
  ];
  return option;
};

const mainMenu = async (user: Partial<IUser>) => {
  const actions = await Action.Fetch({});
  const choices: Array<IOption> = [];
  actions.forEach((action) => choices.push({ title: action.task!, value: action.activity!, menu: [] }));
  choices.push({ title: "End session", value: hexify("0x000000")!, menu: [] });
  return choices;
};

const start = async () => {
  const exists = await User.Count();

  if (exists) {
    const login = await runPrompt(loginOptions());

    if (login.email === "")
      login.username.indexOf("@")
        ? Object.assign(login, { username: `${login.username.slice(0, login.username.indexOf("@"))}`, email: `${login.username}`, password: login.password })
        : console.log(red("Error:"), "Invalid username or password");
    else login.email.slice(0, 1) === "@" && Object.assign(login, { ...login, email: `${login.username}${login.email}` });

    const { username, email, password } = login;
    const user = await User.Login({ username, email, password });

    if (user!.username === username) {
      const choices = await mainMenu(user!);
      do {
        const { response } = await runPrompt(selectOptions(choices, username));
        const choice = choices.find(({ value }) => value.toString() === response.toString());

        switch (response.toString()) {
          case Buffer.from([0, 0, 0]).toString(): {
            console.clear();
            console.log("Session ended.");
            process.exit(0);
          }
        }
      } while (true);
    } else {
      console.log(red("Error:"), "Invalid username or password");
      process.exit(1);
    }
  } else {
    let yes = await runPrompt(choice("No users exist; create one now?"));
    if (yes) {
      console.log(yellow("*** Caution:"), "The user to be created will be granted the Administrator role.");
      const prompt = await runPrompt(loginOptions());
      const { username, email, password } = prompt;
      const confirm = await runPrompt(confirmPassword());
      if (password && password === confirm.password) {
        const user = await User.Add({ username, email, password, title: "Admin" });
        console.log(user ? green("Success!").concat(" Restart the application to continue.") : console.log(red("Error:").concat(" Invalid credientials.")));
      }
    }
  }
  process.exit(0);
};

start();
