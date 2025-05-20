//+--------------------------------------------------------------------------------------+
//|                                                                           app-cli.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import { color, log, red, green, cyan, yellow, bold, dim } from "console-log-colors";
import UserToken from "@cli/interfaces/user";

//+--------------------------------------------------------------------------------------+
//| Displays beautiful header   ;-)                                                      |
//+--------------------------------------------------------------------------------------+
export const setHeader = (heading: string) => {
  const { username, title, error, message } = UserToken();
  const page = `**** ${heading} ****`.padStart((120 - heading.length) / 2, " ");
  const color =
    error === 0
      ? `${green("Success:")} `
      : error < 200
      ? `${cyan(" Confirmed:")} `
      : error < 300
      ? `${yellow("*** Warning:")} `
      : error < 400
      ? `${red("*** Error:")} `
      : ``;

  console.clear();
  console.log(`+----------------------------------------------------------------------------------------+`);
  console.log(`|`);
  console.log(`|`, cyan(page));
  console.log(`|`);
  console.log(`|    `, bold(`Log Time:`), dim(new Date().toLocaleString()));
  username.length === 0 ? console.log(`|`) : console.log(`|        User: ${green(username)}`);
  title && title.length === 0 ? console.log(`|`) : console.log(`|        Role: ${green(title)}`);
  console.log(`|`);
  console.log(`|     ${color} ${message}`);
  console.log(`|`);
  console.log(`+----------------------------------------------------------------------------------------+`);
  console.log(``);
};
