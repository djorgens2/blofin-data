//+--------------------------------------------------------------------------------------+
//|                                                                             State.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt, { IOption } from "@cli/modules/Prompts";
import { Answers } from "prompts";

import * as States from "@db/interfaces/state";

//+--------------------------------------------------------------------------------------+
//| Retrieves state assignments in prompt format;                                        |
//+--------------------------------------------------------------------------------------+
export const setState = async <T extends Answers<string>>(props: T) => {
  const states = await States.Fetch({});
  const choices: Array<IOption> = [];

  if (states) {
    if (props?.state) return states.find(({ state }) => state!.toString() === props.state.toString());
    if (props?.status) return states.find(({ status }) => status === props.status);

    states.forEach((option) => {
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

