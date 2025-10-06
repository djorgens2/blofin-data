//+--------------------------------------------------------------------------------------+
//|                                                                           Environ.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import Prompt, { IOption } from "cli/modules/Prompts";
import { Answers } from "prompts";

//+--------------------------------------------------------------------------------------+
//| Retrieves environment assignments in prompt format;                                  |
//+--------------------------------------------------------------------------------------+
export const setUrl = async <T extends Answers<string>>(props: T) => {
    const choices: Array<IOption> = [];
    
    const url = await Prompt(["text"], { message: props.message, initial: props.initial });
    const verified = await checkURL(url.value);
    return { url, verified };
};

//+--------------------------------------------------------------------------------------+
//| Retrieves environment assignments in prompt format;                                  |
//+--------------------------------------------------------------------------------------+
async function checkURL(url: string) {
  try {
    const response = await fetch(url, { mode: "no-cors" });
    if (response.status === 200) {
      console.log(`URL "${url}" is online.`);
    } else {
      console.log(`URL "${url}" is online but returned status ${response.status}.`);
    }
  } catch (error) {
    console.log(`URL "${url}" is offline or an error occurred:`, error);
  }
}

