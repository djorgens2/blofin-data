import prompts from "prompts";

import type { PromptType } from "prompts";
import type { IBroker } from "@db/interfaces/broker";
import type { IRole } from "@db/interfaces/role";

import { hexify } from "./lib/crypto.util";
import { color, log, red, green, cyan, yellow } from "console-log-colors";
import { Role } from "@db/interfaces/role";

import * as Brokers from "@db/interfaces/broker";
import * as Roles from "@db/interfaces/role";
import * as Users from "@db/interfaces/user";
import * as Subjects from "./db/interfaces/subject";
import { parseJSON } from "./lib/std.util";

interface PromptOptions {
  type: "text" | "select" | "multiselect" | "number" | "confirm" | "toggle" | "password" | null;
  name: string;
  message: string;
  initial?: boolean;
  active?: string;
  inactive?: string;
  choices?: { title: string; value: any }[];
}

interface PromptValues {
  username: string;
  conditionalPrompt: string;
}
async function runPrompt(options: PromptOptions[]) {
  const response = await prompts(options);
  return response;
}

// async function main() {
//   const dynamicOptions: PromptOptions[] = [
//     {
//       type: "text",
//       name: "name",
//       message: "What is your name?",
//     },
//     {
//       type: "select",
//       name: "favoriteColor",
//       message: "What is your favorite color?",
//       choices: [
//         { title: "Red", value: "red" },
//         { title: "Green", value: "green" },
//         { title: "Blue", value: "blue" },
//       ],
//     },
//     {
//       type: "number",
//       name: "age",
//       message: "What is your age?",
//     },
//   ];

//   const answers = await runPrompt(dynamicOptions);
//   console.log("Answers:", answers);
// }

// main();
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

const user = () => {
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

const selectSubject = (choices: Array<{ title: string; value: Uint8Array }>, username: string) => {
  console.clear();
  console.log("Logged in:", new Date().toLocaleDateString(), "User:", green(username));

  const option: PromptOptions[] = [
    {
      type: "select",
      name: "subject",
      message: "Select an option:",
      choices,
    },
  ];
  return option;
};

const loadOptions = async (username: string) => {
  const subjects = await Subjects.Fetch({});
  const choices: Array<{ title: string; value: Uint8Array }> = [];
  subjects.forEach((area) => choices.push({ title: area.area!, value: area.subject! }));
  choices.push({ title: "End session", value: hexify("0x000000")! });
  return choices;
};

const start = async () => {
  const users = await Users.Fetch({});
//  const roles = await Roles.Fetch({});

  if (users.length) {
    const login = await runPrompt(user());

    if (login.email === "")
      login.username.indexOf("@")
        ? Object.assign(login, { username: `${login.username.slice(0, login.username.indexOf("@"))}`, email: `${login.username}`, password: login.password })
        : console.log(red("Error:"), "Invalid username or password");
    else login.email.slice(0, 1) === "@" && Object.assign(login, { ...login, email: `${login.username}${login.email}` });

    const { username, email, password } = login;
    const success = await Users.Login({ username, email, password });
    if (success) {
      const choices = await loadOptions(username);
      do {
        const { subject } = await runPrompt(selectSubject(choices, username));
        if ( subject.toString() === Buffer.from([0,0,0]).toString()) {
          console.clear();
          console.log("Session ended.")
          process.exit(0);
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
      const prompt = await runPrompt(user());
      const { username, email, password } = prompt;
      const confirm = await runPrompt(confirmPassword());
      if (password && password === confirm.password) {
        const user = await Users.Add({ username, email, password, title: "Admin" });
        console.log(user ? green("Success!").concat(" Restart the application to continue.") : console.log(red("Error:").concat(" Invalid credientials.")));
      }
    }
  }
  process.exit(0);
};

start();
