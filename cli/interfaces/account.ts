//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt, { IOption } from "@cli/modules/Prompts";

import { green, red, yellow, cyan, bold, dim } from "console-log-colors";
import { Pause } from "@lib/std.util";

import { setHeader } from "@cli/modules/Header";
import { setState } from "@cli/modules/State";
import { setBroker } from "@cli/interfaces/broker";
import { setUser } from "@cli/interfaces/user";
import { setEnviron } from "@cli/modules/Environ";

import * as Accounts from "@db/interfaces/account";
import { TSession } from "@module/session";

//+--------------------------------------------------------------------------------------+
//| Retrieves accounts from local server; if new, prompts to create;                     |
//+--------------------------------------------------------------------------------------+
export const setAccount = async (props: any) => {
  const alias = await Prompt(["text"], { name: "alias", message: "  Nickname for Account?", initial: props?.alias ? props?.alias : `` });
  const owner = await setUser({ title: "Admin" });
  const broker = await setBroker();
  const state = await setState();
  const environ = await setEnviron({});
  const rest_api_url = await Prompt(["text"], {
    name: "rest_api_url",
    message: "  Public REST API URL:",
    initial: props?.rest_api_url ? props?.rest_api_url : ``,
  });
  const wss_url = await Prompt(["text"], { name: "wss_url", message: "  Websocket URL:", initial: props?.wss_url ? props?.wss_url : `` });
  const wss_public_url = await Prompt(["text"], {
    name: "wss_public_url",
    message: "  Public URL:",
    initial: props?.wss_public_url ? props?.wss_public_url : ``,
  });
  const api = props?.api === undefined ? await Prompt(["text"], { name: "api", message: "  API Key:" }) : { api: props.api };
  const secret = props?.secret === undefined ? await Prompt(["text"], { name: "secret", message: "  Secret Key:" }) : { secret: props.secret };
  const phrase = props?.phrase === undefined ? await Prompt(["text"], { name: "phrase", message: "  Passphrase:" }) : { phrase: props.phrase };

  console.log(``);

  const { choice } = await Prompt(["choice"], {
    message: `  `,
    active: "Accept",
    inactive: "Cancel",
    initial: true,
  });

  if (choice) {
    await Accounts.Add({
      ...alias,
      ...owner,
      ...broker,
      ...state,
      ...environ,
      ...rest_api_url,
      ...wss_url,
      ...wss_public_url,
      ...api,
      ...secret,
      ...phrase,
    });
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
export const menuViewAccount = async () => {
  setHeader("View Accounts");
  console.log(
    `\n✔️ `,
    `${bold("Job Name".padEnd(16, " "))}`,
    `${bold("Account Holder".padEnd(20, " "))}`,
    `${bold("Environment".padEnd(16, " "))}`,
    `${bold("Status".padEnd(12, " "))}`,
    `${bold("Web Socket Address".padEnd(52, " "))}`,
    `${bold("REST API Address".padEnd(52, " "))}`,
    `${bold("Available".padEnd(12, " "))}`
  );
  (await Accounts.Fetch({})).forEach((account) => {
    const { alias, owner_name, environ, status, wss_url, rest_api_url } = account;
    const available = "No";
    console.log(
      `${status! === "Enabled" ? "🔹" : "🔸"} `,
      `${alias!.padEnd(16, " ")}`,
      `${owner_name.padEnd(20, " ")}`,
      `${environ!.padEnd(16, " ")}`,
      `${status === "Enabled" ? cyan(status!.padEnd(12, " ")) : status === "Disabled" ? red(status!.padEnd(12, " ")) : yellow(status!.padEnd(12, " "))}`,
      `${wss_url!.padEnd(52, " ")}`,
      `${rest_api_url!.padEnd(52, " ")}`,
      `   ${available.padEnd(12, " ")}`
    );
  });
  console.log(``);
  const { choice } = await Prompt(["choice"], { message: "  ", active: "Refresh", inactive: "Finished", initial: false });
};

//+--------------------------------------------------------------------------------------+
//| Presents the Imports view;                                                           |
//+--------------------------------------------------------------------------------------+
const setImports = async (imports: Array<Partial<TSession>>) => {
  for (let id = 0; id < imports.length; id++) {
    const { alias, api, secret, phrase, wss_url, rest_api_url, wss_public_url } = imports[id];

    console.log(`\n >>> ${green("Imports")}: ${bold(id + 1)} of ${bold(imports.length)}\n`);

    alias && console.log(`            ${yellow("Alias")}: ${dim(alias)}`);
    api && console.log(`         ${yellow("API Key")}: ${dim(api)}`);
    secret && console.log(`     ${yellow("Private Key")}: ${dim(secret)}`);
    phrase && console.log(`          ${yellow("Phrase")}: ${dim(phrase)}`);
    rest_api_url && console.log(`         ${yellow("API URL")}: ${dim(rest_api_url)}`);
    wss_url && console.log(`      ${yellow("Socket URL")}: ${dim(wss_url)}`);
    wss_public_url && console.log(`      ${yellow("Public URL")}: ${dim(wss_public_url)}`);

    console.log(" ");

    await setAccount(imports[id]);
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
export const menuCreateAccount = async () => {
  setHeader("Create Account");
  const imports = await Accounts.Import();

  if (imports.length > 0) {
    const { choice } = await Prompt(["choice"], {
      message: `  New account${imports.length > 1 ? "s" : ``} detected; configure now?`,
      active: "Yes",
      inactive: "No",
      initial: true,
    });

    if (choice) {
      await setImports(imports);
    } else {
      await Pause("Really?");
    }
  } else await setAccount({});
};

//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
export const menuEditAccount = async () => {
  setHeader("Edit User");
};

//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
export const menuDropAccount = async () => {
  setHeader("Drop User");
};
