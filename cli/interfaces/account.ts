//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ISession } from "@module/session";
import type { IAccount } from "@db/interfaces/account";
import type { TAccess } from "@db/interfaces/state";

import { green, red, yellow, cyan, gray, bold, dim } from "console-log-colors";
import { formatterUSD, getLengths, Pause } from "@lib/std.util";

import { setHeader } from "@cli/modules/Header";
import { setState } from "@cli/modules/State";
import { setBroker } from "@cli/interfaces/broker";
import { setUser } from "@cli/interfaces/user";
import { setEnviron } from "@cli/modules/Environ";

import * as Accounts from "@db/interfaces/account";

import Prompt from "@cli/modules/Prompts";

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
  const private_wss_url = await Prompt(["text"], {
    name: "private_wss_url",
    message: "  Private WSS URL:",
    initial: props?.private_wss_url ? props?.private_wss_url : ``,
  });
  const public_wss_url = await Prompt(["text"], {
    name: "public_wss_url",
    message: "  Public URL:",
    initial: props?.public_wss_url ? props?.public_wss_url : ``,
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
    console.error({
      ...alias,
      ...owner,
      ...broker,
      ...state,
      ...environ,
      ...rest_api_url,
      ...private_wss_url,
      ...public_wss_url,
      ...api,
      ...secret,
      ...phrase,
    });

    await Accounts.Add({
      ...alias,
      ...owner,
      ...broker,
      state: state?.state,
      status: state?.status as TAccess,
      ...environ,
      ...rest_api_url,
      ...private_wss_url,
      ...public_wss_url,
    },{
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

  const colBuffer = 3;
  const accounts = await Accounts.Fetch({});
  const keylen = await getLengths<IAccount>(
    {
      alias: 16,
      owner_name: 20,
      environ: 16,
      status: 12,
      symbol: 8,
      balance: 12,
      available: 12,
    },
    accounts!
  );

  console.log(
    `\n✔️ `,
    `${bold("Account".padEnd(keylen.alias+colBuffer, " "))}`,
    `${bold("Account Holder".padEnd(keylen.owner_name+colBuffer, " "))}`,
    `${bold("Environment".padEnd(keylen.environ+colBuffer, " "))}`,
    `${bold("Status".padEnd(keylen.status+colBuffer, " "))}`,
    `${bold("Currency".padEnd(keylen.symbol+colBuffer, " "))}`,
    `${bold("Balance".padStart(keylen.balance+colBuffer, " "))}`,
    `${bold("Available".padStart(keylen.available+colBuffer, " "))}`
  );

  if (accounts)
    for (const account of accounts) {
      const { alias, owner_name, environ, status, symbol, balance, available } = account;
      console.log(
        `${status! === "Enabled" ? "🔹" : "🔸"} `,
        `${gray(alias!.padEnd(keylen.alias+colBuffer, " "))}`,
        `${gray(owner_name!.padEnd(keylen.owner_name+colBuffer, " "))}`,
        `${gray(environ!.padEnd(keylen.environ+colBuffer, " "))}`,
        `${status === "Enabled"
            ? cyan(status!.padEnd(keylen.status+colBuffer, " "))
            : status === "Disabled"
            ? red(status!.padEnd(keylen.status+colBuffer, " "))
            : yellow(status!.padEnd(keylen.status+colBuffer, " "))
        }`,
        `${gray((symbol ? symbol : "Pending").padEnd(keylen.symbol+colBuffer, " ") )}`,
        `${gray(formatterUSD.format(balance || 0).padStart(keylen.balance+colBuffer, " "))}`,
        `${gray(formatterUSD.format(available || 0).padStart(keylen.available+colBuffer, " "))}`
      );
    }
  console.log(``);
  const { choice } = await Prompt(["choice"], { message: "  ", active: "Refresh", inactive: "Finished", initial: false });
};

//+--------------------------------------------------------------------------------------+
//| Presents the Imports view;                                                           |
//+--------------------------------------------------------------------------------------+
const setImports = async (imports: Array<Partial<ISession>>) => {
  let id = 1;

  for (const key of imports) {
    const { alias, api, secret, phrase, rest_api_url, private_wss_url, public_wss_url } = key;

    console.log(`\n >>> ${green("Imports")}: ${bold(id++)} of ${bold(imports.length)}\n`);

    alias && console.log(`      ${yellow("Alias")}: ${dim(alias)}`);
    api && console.log(`      ${yellow("API Key")}: ${dim(api)}`);
    secret && console.log(`      ${yellow("Private Key")}: ${dim(secret)}`);
    phrase && console.log(`      ${yellow("Phrase")}: ${dim(phrase)}`);
    rest_api_url && console.log(`      ${yellow("Public REST API URL")}: ${dim(rest_api_url)}`);
    private_wss_url && console.log(`      ${yellow("Priate Websocket (WSS) URL")}: ${dim(private_wss_url)}`);
    public_wss_url && console.log(`      ${yellow("Public Websocket (WSS) URL")}: ${dim(public_wss_url)}`);

    console.log(" ");

    await setAccount(key);
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
