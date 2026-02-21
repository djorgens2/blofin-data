//+--------------------------------------------------------------------------------------+
//|                                                                      [cli]  State.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { TStates, IState } from "#db/interfaces/state";
import Prompt, { type IOption } from "#cli/modules/Prompts";
import { isEqual } from "#lib/std.util";

import { State } from "#db";

//+--------------------------------------------------------------------------------------+
//| Retrieves state values (filtered) in prompt format;                                  |
//+--------------------------------------------------------------------------------------+
export const setState = async () => {
  const states = await State.Fetch<IState>({});
  const options: Array<TStates> = ["Disabled", "Enabled"];
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
    const choice = choices.find(({ value }) => isEqual(value, select));

    return { state: choice!.value, status: choice!.title };
  }
};
