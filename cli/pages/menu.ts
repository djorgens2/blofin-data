//+--------------------------------------------------------------------------------------+
//|                                                                              menu.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt, { IOption } from "@cli/modules/Prompts";

import { setHeader } from "@cli/modules/Header";
import { setMenu } from "@cli/modules/Menu";

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
