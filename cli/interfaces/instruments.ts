//+--------------------------------------------------------------------------------------+
//|                                                                [cli]  instruments.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ISession } from "#module/session";
import type { IAccount } from "#db/interfaces/account";
import type { TAccess } from "#db/interfaces/state";
import type { IInstrumentPosition } from "#db/interfaces/instrument_position";

import { green, red, yellow, cyan, gray, bold, dim } from "console-log-colors";
import { formatterUSD, getLengths, Pause } from "#lib/std.util";

import prompts from "prompts";
import Prompt from "#cli/modules/Prompts";

import { setHeader } from "#cli/modules/Header";
import { setState } from "#cli/modules/State";
import { setBroker } from "#cli/interfaces/broker";
import { setUser } from "#cli/interfaces/user";
import { setEnviron } from "#cli/modules/Environ";

import * as InstrumentPosition from "#db/interfaces/instrument_position";
import * as Accounts from "#db/interfaces/account";
import * as db from "#db/query.utils";

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

    await Accounts.Add(
      {
        ...alias,
        ...owner,
        ...broker,
        state: state?.state,
        status: state?.status as TAccess,
        ...environ,
        ...rest_api_url,
        ...private_wss_url,
        ...public_wss_url,
      },
      {
        ...api,
        ...secret,
        ...phrase,
      },
    );
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the Account submenu as instruments are organized by account;                |
//+--------------------------------------------------------------------------------------+
export const accountSelect = async () => {
  setHeader("View Accounts");

  const accounts = await Accounts.Fetch({});
  const keylen = await getLengths<IAccount>(
    {
      alias: 24,
      owner_name: 24,
      environ: 20,
      status: 16,
      account_currency: 12,
      balance: 20,
      available: 20,
      colBuffer: 5,
    },
    accounts!,
  );

  console.log(
    `\n       ` +
      `${bold("Account".padEnd(keylen.alias, " "))}` +
      `${bold("Account Holder".padEnd(keylen.owner_name, " "))}` +
      `${bold("Environment".padEnd(keylen.environ, " "))}` +
      `${bold("Status".padEnd(keylen.status, " "))}` +
      `${bold("Currency".padEnd(keylen.account_currency, " "))}` +
      `${bold("Balance".padStart(keylen.balance, " "))}` +
      `${bold("Available".padStart(keylen.available, " "))}`,
  );

  if (accounts) {
    const choices = accounts.map((account) => ({
      title:
        `${account.status! === "Enabled" ? "🔹" : "🔸"} ` +
        `${gray(account.alias!.padEnd(keylen.alias, " "))}` +
        `${gray(account.owner_name!.padEnd(keylen.owner_name, " "))}` +
        `${gray(account.environ!.padEnd(keylen.environ, " "))}` +
        `${
          account.status === "Enabled"
            ? cyan(account.status!.padEnd(keylen.status, " "))
            : account.status === "Disabled"
              ? red(account.status!.padEnd(keylen.status, " "))
              : yellow(account.status!.padEnd(keylen.status, " "))
        }` +
        `${gray((account.account_currency ? account.account_currency : "Pending").padEnd(keylen.account_currency, " "))}` +
        `${gray(formatterUSD.format(account.balance || 0).padStart(keylen.balance, " "))}` +
        `${gray(formatterUSD.format(account.available || 0).padStart(keylen.available, " "))}`,
      value: account.alias,
    }));

    console.log(``);
    const response = await prompts({
      type: "select",
      name: "chosenAccountAlias",
      message: "Select an account:",
      choices: choices,
      initial: 0,
    });
    const selectedAlias = response.chosenAccountAlias;
    return selectedAlias;
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the Instruments submenu for the selected by account;                        |
//+--------------------------------------------------------------------------------------+
export const symbolSelect = async (alias: string) => {
  setHeader("Authorized Instruments");

  const authorized = await db.Distinct<IInstrumentPosition>(
    { alias, symbol: undefined, environ: undefined },
    { table: `vw_instrument_positions`, keys: [[`alias`]], suffix: `ORDER BY SYMBOL` },
  );

  const keylen = await getLengths<IInstrumentPosition>(
    {
      alias: 24,
      environ: 20,
      symbol: 12,
      colBuffer: 5,
    },
    authorized.data!,
  );

  console.log(
    `\n    ` +
      `${bold("Account".padEnd(keylen.alias, " "))}` +
      `${bold("Environment".padEnd(keylen.environ, " "))}` +
      `${bold("Symbol".padEnd(keylen.symbol, " "))}`,
  );

  if (authorized.success) {
    const choices = authorized?.data?.map((i) => ({
      title:
        `${gray(alias.padEnd(keylen.alias, " "))}` + `${gray(i.environ!.padEnd(keylen.environ, " "))}` + `${gray(i.symbol!.padEnd(keylen.symbol, " "))}`,
      value: i.symbol,
    }));

    console.log(``);
    const response = await prompts({
      type: "select",
      name: "chosenSymbol",
      message: "Select an instrument:",
      choices: choices,
      initial: 0,
    });
    const selectedSymbol = response.chosenSymbol;
    return selectedSymbol;
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the Instruments submenu for the selected by account;                        |
//+--------------------------------------------------------------------------------------+
export const instrumentSelect = async (alias: string, symbol: string) => {
  setHeader(`Authorized Instruments by Account: `);

  const positions = await InstrumentPosition.Fetch({ alias, symbol });

  const keylen = await getLengths<IInstrumentPosition>(
    {
      alias: 24,
      environ: 20,
      symbol: 12,
      position: 12,
      colBuffer: 5,
    },
    positions!,
  );

  console.log(
    `\n    ` +
      `${bold("Account".padEnd(keylen.alias, " "))}` +
      `${bold("Environment".padEnd(keylen.environ, " "))}` +
      `${bold("Symbol".padEnd(keylen.symbol, " "))}`,
      `${bold("Position".padEnd(keylen.position, " "))}`,
  );

  if (positions) {
    const choices = positions.map((i) => ({
      title:
        `${gray(alias.padEnd(keylen.alias, " "))}` + `${gray(i.environ!.padEnd(keylen.environ, " "))}` + `${gray(symbol.padEnd(keylen.symbol, " "))}`+ `${gray(i.position!.padEnd(keylen.position, " "))}`,
      value: i.symbol,
    }));

    console.log(``);
    const response = await prompts({
      type: "select",
      name: "chosenSymbol",
      message: "Select an instrument:",
      choices: choices,
      initial: 0,
    });
    const selectedSymbol = response.chosenSymbol;
    return selectedSymbol;
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the Instruments submenu for the selected by account;                        |
//+--------------------------------------------------------------------------------------+
export const View = async () => {
  setHeader("View Instruments by Account");

  const alias = await accountSelect();
  const symbol = await symbolSelect(alias);
  const instrument = await instrumentSelect(alias, symbol);
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
  const imports = await Accounts.Available(`New`);

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
