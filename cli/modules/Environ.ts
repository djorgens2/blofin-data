//+--------------------------------------------------------------------------------------+
//|                                                                           Environ.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt, { IOption } from "@cli/modules/Prompts";
import { Answers } from "prompts";

import * as Environs from "@db/interfaces/environment";

//+--------------------------------------------------------------------------------------+
//| Retrieves environment assignments in prompt format;                                  |
//+--------------------------------------------------------------------------------------+
export const setEnviron = async <T extends Answers<string>>(props: T) => {
  const count = async () => {
    const environs = await Environs.Fetch({});
    if (environs.length === 0) {
      await Environs.Import();
      return 1;
    }
    return environs.length;
  };
  await count();

  const environment = await Environs.Fetch({});
  const choices: Array<IOption> = [];

  if (environment) {
    if (props?.environment) return environment.find(({ environment }) => environment!.toString() === props.environment.toString());
    if (props?.environ) return environment.find(({ environ }) => environ === props.environ);

    environment.forEach((option) => {
      choices.push({
        title: option.environ!,
        value: option.environment!,
      });
    });

    const { select } = await Prompt(["select"], { message: "  Which Environment?", choices });
    const choice = choices.find(({ value }) => value.toString() === select.toString());

    return { environment: choice!.value, environ: choice!.title };
  }
};
