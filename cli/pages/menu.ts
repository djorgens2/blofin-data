//+--------------------------------------------------------------------------------------+
//|                                                                              menu.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt, { IOption } from "@cli/modules/Prompts";

import { setHeader } from "@cli/modules/Header";
import { setMenu } from "@cli/modules/Menu";

import { menuCreateUser, menuEditUser, menuViewUser, menuDropUser } from "@cli/interfaces/user";

//+--------------------------------------------------------------------------------------+
//| View menu; displays the rows for the supplied subject area;                          |
//+--------------------------------------------------------------------------------------+
export const menuView = async (area: string) => {
  switch (area) {
    case "User":
      await menuViewUser();
    default:
      console.log(`${area} not enabled.`);
  }
};

//+--------------------------------------------------------------------------------------+
//| Edit menu; lists rows for supplied subject area; runs editor on mutable fields;      |
//+--------------------------------------------------------------------------------------+
export const menuEdit = async (area: string) => {
  switch (area) {
    case "User":
      await menuEditUser();
    default:
      console.log(`${area} not enabled.`);
  }
};

//+--------------------------------------------------------------------------------------+
//| Create menu; opens the create dialogue for the supplied area;                        |
//+--------------------------------------------------------------------------------------+
export const menuCreate = async (area: string) => {
  switch (area) {
    case "User":
      await menuCreateUser();
    default:
      console.log(`${area} not enabled.`);
  }
};

//+--------------------------------------------------------------------------------------+
//| Drop menu; opens the drop dialogue for the supplied area;                            |
//+--------------------------------------------------------------------------------------+
export const menuDrop = async (area: string) => {
  switch (area) {
    case "User":
      await menuDropUser();
    default:
      console.log(`${area} not enabled.`);
  }
};

//+--------------------------------------------------------------------------------------+
//| Configuration menu; opens the configuration dialogue for the supplied area;          |
//+--------------------------------------------------------------------------------------+
export const menuConfigure = async (area: string) => {
  switch (area) {
    default:
      console.log(`${area} not enabled.`);
  }
};

//+--------------------------------------------------------------------------------------+
//| Operations menu; opens the operations dialogue for the supplied area;                |
//+--------------------------------------------------------------------------------------+
export const menuOperate = async (area: string) => {
  switch (area) {
    default:
      console.log(`${area} not enabled.`);
  }
};

//+--------------------------------------------------------------------------------------+
//| Main menu setup/config script;                                                       |
//+--------------------------------------------------------------------------------------+
export const Menu = async () => {
  do {
    setHeader(`Main Menu`);

    const menu: Array<IOption> = await setMenu();
    const { select } = await Prompt(["select"], { choices: menu });
    const key = select ? select : Buffer.from([0, 0, 0]);
    const option = menu.find(({ value }) => value.toString() === key.toString());

    switch (option?.title) {
      case "End Session": {
        console.clear();
        console.log("Session ended.");
        process.exit(0);
      }

      default: {
        const { select } = await Prompt(["select"], { choices: option?.choices });
        const key = select ? select : Buffer.from([0, 0, 0]);
        const suboption = option?.choices!.find(({ value }) => value.toString() === key.toString());
        suboption?.func && (await eval(suboption?.func));
      }
    }
  } while (true);
};
