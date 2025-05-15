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
import * as sra from "@db/interfaces/subject_role_authority";

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

async function runPrompt(options: PromptOptions[]) {
  const response = await prompts(options);
  return response;
}

const loginOptions = () => {
  const option: PromptOptions[] = [
    {
      type: "text",
      name: "username",
      message: "Username:",
    },
    {
      type: prev => prev.indexOf("@") > 0 ? null : "text",
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

async function runSelect(username: string, choices: Array<IOption>) {
  console.clear();
  console.log("Logged in:", new Date().toLocaleDateString(), "User:", green(username));
  console.log("");

  const options: PromptOptions[] = [
    {
      type: "select",
      name: "response",
      message: "Select an option:",
      choices,
    },
  ];
  const { response } = await prompts(options);
  const key = response ? response : Buffer.from([0, 0, 0]);
  const select = choices.find(({ value }) => value.toString() === key.toString());

  return [key, select];
}

const mainMenu = async (role: Uint8Array) => {
  const menu = await sra.FetchSubjects({ role });
  const choices: Array<IOption> = [];
  for (let key = 0; key < menu.length; key++) {
    const { role, subject, area } = menu[key];
    const privs = await sra.FetchPrivileges({ role, subject, enabled: true });
    const submenu = privs.map((priv) => ({
      title: priv.privilege!,
      value: priv.authority!,
      menu: [],
    }));
    choices.push({ title: area!, value: subject!, menu: submenu });
  }
  choices.push({ title: "End Session", value: hexify("0x000000")!, menu: [] });
  return choices;
};

export interface ILogon {
  username: string;
  role: Uint8Array;
  error: number;
  message: string;
}
const runLogon = async (): Promise<ILogon> => {
  const anyUserExists = await User.Count();
  const response: ILogon = {username: ``, role: Buffer.from([0,0,0]), error: 0, message: 'ok'};

  if (anyUserExists) {
    let { username, email, password } = await runPrompt(loginOptions());

    if (email && email.slice(0, 1) === "@") {
      email = `${username}${email}`;
    } else if (username && username.indexOf("@") > 0) {
      email = username;
      username = username.slice(0, username.indexOf("@"));
    } else if (!username || !email || !password) {
      Object.assign(response, { error: 102, message: "Invalid user credentials." });
    }

    if (!response.error) {
      const login = await User.Login({ username, email, password });

      if (login) Object.assign(response, { username, role: login.role, error: 0, message: "Success" });
      else Object.assign(response, { error: 103, message: "Invalid username or password" });
    }
  } else {
    const yes = await runPrompt(choice("No users exist; create one now?"));

    if (yes) {
      console.log(yellow("*** Caution:"), "The user to be created will be granted the Administrator role.");

      const prompt = await runPrompt(loginOptions());
      const { username, email, password } = prompt;
      const confirm = await runPrompt(confirmPassword());

      if (password && password === confirm.password) {
        const confirmed = await User.Add({ username, email, password, title: "Admin" });

        if (confirmed) {
          Object.assign(response, { username, error: 101, message: `User ${username} created.` });
        } else {
          Object.assign(response, { error: 102, message: "Invalid user credentials." });
        }
      }
    }
  }
  return response;
};

const start = async () => {
  const { username, role, error, message } = await runLogon();
  if (error) {
    error > 101 ? console.log(red("Error:"), message) : console.log(yellow("Success:"), message);
    process.exit(error);
  } else {
    const choices = await mainMenu(role);

    do {
      const [key, select] = await runSelect(username, choices);

      switch (select?.title) {
        case "End Session": {
          console.clear();
          console.log("Session ended.");
          process.exit(0);
        }
        default: {
          console.clear();
          const [key, subselect] = await runSelect(username, select.menu);
        }
      }
    } while (true);
  }
};

start();
