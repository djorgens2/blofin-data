//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import Prompt, { type IOption } from "#cli/modules/Prompts";

import { setHeader } from "#cli/modules/Header";
import { red, yellow, cyan, bold } from "console-log-colors";

import * as Accounts from "#db/interfaces/account";
import * as Brokers from "#db/interfaces/broker";

//+--------------------------------------------------------------------------------------+
//| Retrieves broker assignments in prompt format;                                       |
//+--------------------------------------------------------------------------------------+
export const setBroker = async () => {
  const brokers = await Brokers.Fetch({});

  if (brokers) {
    const choices: Array<IOption> = [];

    brokers.forEach((option) => {
      choices.push({
        title: option.name!,
        value: option.broker!,
      });
    });

    const { select } = await Prompt(["select"], { message: "  Select a Broker:", choices });
    const choice = choices.find(({ value }) => value.toString() === select.toString());

    return { broker: choice!.value, name: choice!.title };
  }
};

//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
export const menuViewBroker = async () => {
  setHeader("View Accounts");

  const accounts = await Accounts.Fetch({});

  console.log(
    `\n✔️ `,
    `${bold("Broker".padEnd(32, " "))}`,
    `${bold("Alias".padEnd(16, " "))}`,
    `${bold("name".padEnd(12, " "))}`,
    `${bold("Websocket Address".padEnd(36, " "))}`,
    `${bold("REST API Address".padEnd(36, " "))}`,
    `${bold("Installed".padEnd(12, " "))}`,
  );
  if (accounts)
    for (const account of accounts) {
      const { broker_name, status, private_wss_url, rest_api_url } = account;
      const installed = "No";
      console.log(
        `${status! === "Enabled" ? "🔹" : "🔸"}`,
        `${broker_name!.padEnd(32, " ")}`,
        `${status === "Enabled" ? cyan(status!.padEnd(12, " ")) : status === "Disabled" ? red(status!.padEnd(12, " ")) : yellow(status!.padEnd(12, " "))}`,
        `${private_wss_url!.padEnd(36, " ")}`,
        `${rest_api_url!.padEnd(36, " ")}`,
        `${installed!.padEnd(12, " ")}`,
      );
    }
  console.log(``);
  await Prompt(["choice"], { message: ">", active: "Refresh", inactive: "Finished", initial: false });
};

//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
export const menuCreateBroker = async () => {
  setHeader("Create Broker");
  //  await setCredentials(true);
};

//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
export const menuEditBroker = async () => {
  setHeader("Edit Broker");
};

//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
export const menuDropBroker = async () => {
  setHeader("Drop Broker");
};
