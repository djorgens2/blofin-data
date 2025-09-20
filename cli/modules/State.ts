//+--------------------------------------------------------------------------------------+
//|                                                                             State.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import type { TState } from "@db/interfaces/state";
import Prompt, { IOption } from "@cli/modules/Prompts";
import * as States from "@db/interfaces/state";

//+--------------------------------------------------------------------------------------+
//| Retrieves state values (filtered) in prompt format;                                  |
//+--------------------------------------------------------------------------------------+
export const setState = async () => {
  const states = await States.Fetch({});
  const options:Array<TState> = ["Disabled", "Enabled"];
  const choices: Array<IOption> = [];

  if (states) {
    states.forEach((option) => {
      if (options.includes(option.status!))
        choices.push({
          title: option.status!,
          value: option.state!,
        });
    });

    const { select } = await Prompt(["select"], { message: "  Select a State:", choices });
    const choice = choices.find(({ value }) => value.toString() === select.toString());

    return { state: choice!.value, status: choice!.title };
  }
};
