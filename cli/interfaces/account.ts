/**
 * @module Account-Controller
 * @description Orchestrates Account lifecycle, from environment discovery to DB persistence.
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { ISession } from "#module/session";
import type { IAccount } from "#db/interfaces/account";
import type { TAccess } from "#db/interfaces/state";
import type { ITableConfig } from "#cli/modules/Renderer";
import { green, red, yellow, cyan, gray, bold, dim } from "console-log-colors";
import { formatterUSD, Pause } from "#lib/std.util";
import { setHeader } from "#cli/modules/Header";
import { setState } from "#cli/modules/State";
import { setBroker } from "#cli/interfaces/broker";
import { setUser } from "#cli/interfaces/user";
import { setEnviron } from "#cli/modules/Environ";
import { renderTable } from "#cli/modules/Renderer";
import * as Accounts from "#db/interfaces/account";
import Prompt from "#cli/modules/Prompts";

const schema: ITableConfig<IAccount>[] = [
  { key: "alias", label: "Account" },
  { key: "owner_name", label: "Holder" },
  { key: "environ", label: "Env" },
  {
    key: "status",
    label: "Status",
    color: (v) => (v.includes("Enabled") ? cyan(v) : v.includes("Disabled") ? red(v) : yellow(v)),
  },
  { key: "account_currency", label: "CCY" },
  {
    key: "balance",
    label: "Balance",
    align: "right",
    // We MUST format inside the row data itself for the measurement to be accurate
  },
  {
    key: "available",
    label: "Available",
    align: "right",
  },
];

/**
 * Interactive dialogue for defining or updating Account properties.
 *
 * @async
 * @param props - Initial properties (e.g., from an environment discovery).
 */
export const setAccount = async (props: any) => {
  const alias = await Prompt(["text"], { name: "alias", message: "  Nickname for Account?", initial: props?.alias ?? "" });
  const owner = await setUser({ title: "Admin" });
  const broker = await setBroker();
  const state = await setState();
  const environ = await setEnviron({});

  // URL configurations
  const rest_api_url = await Prompt(["text"], { name: "rest_api_url", message: "  Public REST API URL:", initial: props?.rest_api_url ?? "" });
  const private_wss_url = await Prompt(["text"], { name: "private_wss_url", message: "  Private WSS URL:", initial: props?.private_wss_url ?? "" });
  const public_wss_url = await Prompt(["text"], { name: "public_wss_url", message: "  Public URL:", initial: props?.public_wss_url ?? "" });

  // Credential masking logic
  const api = props?.api === undefined ? await Prompt(["text"], { name: "api", message: "  API Key:" }) : { api: props.api };
  const secret = props?.secret === undefined ? await Prompt(["text"], { name: "secret", message: "  Secret Key:" }) : { secret: props.secret };
  const phrase = props?.phrase === undefined ? await Prompt(["text"], { name: "phrase", message: "  Passphrase:" }) : { phrase: props.phrase };

  const { choice } = await Prompt(["choice"], { message: "Accept these settings?", active: "Accept", inactive: "Cancel", initial: true });

  if (choice) {
    await Accounts.Add(
      {
        ...alias,
        ...owner,
        ...broker,
        state: state?.state,
        status: state?.status,
        ...environ,
        ...rest_api_url,
        ...private_wss_url,
        ...public_wss_url,
      } as IAccount,
      { ...api, ...secret, ...phrase },
    );
  }
};

/**
 * Renders the Account table using the Global Renderer.
 * Replaces manual padding with dynamic schema-based widths.
 */
export const View = async () => {
  setHeader("View Accounts");
  const accounts = await Accounts.Fetch({}) ?? [];

  if (!accounts || accounts.length === 0) {
    console.log(yellow("\n   # No accounts found in local database."));
    await Pause("  Please create an account to view details.");
    return;
  }

  // Map the data to include the USD strings BEFORE sending to the renderer
  const displayData = accounts.map((acc) => ({
    ...acc, 
    balance: formatterUSD.format(Number(acc.balance || 0)),
    available: formatterUSD.format(Number(acc.available || 0)),
    account_currency: acc.account_currency || "Pending",
  }));

  // margin: 2 and gutter: 5 provides consistent spacing and breathing room between columns;
  renderTable(displayData as any[], schema, { margin: 2, gutter: 5, statusKey: "status" });

  const { choice } = await Prompt(["choice"], { message: "  ", active: "Refresh", inactive: "Finished", initial: false });
  if (choice) await View();
};

/**
 * Handles the batch configuration of discovered accounts (ETL style).
 * @internal
 */
const setAvailability = async (accounts: Array<Partial<ISession>>) => {
  let id = 1;
  for (const key of accounts) {
    console.log(`\n >>> ${green("Imports")}: ${bold(id++)} of ${bold(accounts.length)}\n`);
    // Render masked configuration preview
    Object.entries(key).forEach(([k, v]) => v && console.log(`      ${yellow(k)}: ${dim(v)}`));
    await setAccount(key);
  }
};

/**
 * Logic for initializing new accounts found in local storage/env.
 */
export const menuCreateAccount = async () => {
  setHeader("Create Account");
  const accounts = await Accounts.Available("New");

  if (accounts.length > 0) {
    const { choice } = await Prompt(["choice"], {
      message: `  New account${accounts.length > 1 ? "s" : ``} detected; configure now?`,
      active: "Yes",
      inactive: "No",
      initial: true,
    });

    if (choice) await setAvailability(accounts);
    else await Pause("Operation deferred.");
  } else {
    await setAccount({});
  }
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
