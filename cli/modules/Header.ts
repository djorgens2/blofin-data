//+--------------------------------------------------------------------------------------+
//|                                                                           app-cli.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import { color, log, red, green, cyan, yellow, bold, dim } from "console-log-colors";
import UserToken from "#cli/interfaces/user";

//+--------------------------------------------------------------------------------------+
//| Displays beautiful header   ;-)                                                      |
//+--------------------------------------------------------------------------------------+
export const setHeader = (heading: string) => {
  const { username, title, error, message } = UserToken();
  const content = `**** ${heading} ****`;
  const paddingLeft = Math.floor((172 - content.length) / 2);
  const page = content.padStart(paddingLeft, " ");

  const color =
    error === 0
      ? `${green("    Success:")} `
      : error < 200
        ? `${cyan("  Confirmed:")} `
        : error < 300
          ? `${yellow("*** Warning:")} `
          : error < 400
            ? `${red("  *** Error:")} `
            : `             `;

  console.clear();
  console.log(`┌${"─".repeat(132)}┐`);
  console.log(`│${" ".repeat(132)}│`);
  console.log(`│` + cyan(page).padEnd(142) + `│`);
  console.log(`│${" ".repeat(132)}│`);
  console.log(`│    `, bold(`Log Time:`), dim(new Date().toLocaleString().padEnd(117)) + "│");
  username.length === 0 ? console.log(`│${" ".repeat(132)}│`) : console.log(`│        User: ${green(username).padEnd(128)}│`);
  title.length === 0 ? console.log(`│${" ".repeat(132)}│`) : console.log(`│        Role: ${green(title).padEnd(128)}│`);
  console.log(`│${" ".repeat(132)}│`);
  console.log(`│${color} ${message.padEnd(118)}` + "│");
  console.log(`│${" ".repeat(132)}│`);
  console.log(`└${"─".repeat(132)}┘`);
  console.log(``);
};
