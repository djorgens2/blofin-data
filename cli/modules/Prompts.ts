//+--------------------------------------------------------------------------------------+
//|                                                                           Prompts.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import prompts, { type Answers, PromptObject } from "prompts";

const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface IOptions {
  username?: Answers<string>;
  email?: Answers<string>;
  password?: Answers<string>;
  confirm?: Answers<string>;
  verified?: Answers<string>;
  message?: string;
  active?: string;
  inactive?: string;
  initial?: boolean | string | number;
}

export interface IOption {
  title: string;
  value: Uint8Array;
  choices?: Array<IOption>;
  func?: string;
}

const runDialogue = async (options: Array<string>, props?: IOptions | Partial<IOption> ) => {
  __dialogue.length = 0;
  options.forEach((option) => {
    const __prompt = __prompts.find(({ name }) => name === option);
    props && Object.assign(__prompt!, { ...__prompt, ...props });
    __prompt && __dialogue.push(__prompt);
  });
  const response = await prompts(__dialogue);
  return response;
};

const __dialogue: Array<PromptObject> = [];
const __prompts: Array<PromptObject> = [
  {
    type: "text",
    name: "username",
    message: "  User Name:",
    validate: (value) => (value.length > 0 ? true : `Enter a valid username.`),
  },
  {
    type: (prev) => (regex.test(prev) ? null : "text"),
    name: "email",
    message: "  E-Mail:",
    validate: (value) => (regex.test(value) ? true : `Enter a valid email address.`),
  },
  {
    type: "password",
    name: "password",
    message: "  Password:",
    validate: (value) => (value.length > 0 ? true : `Enter a valid password.`),
  },
  {
    type: "password",
    name: "confirm",
    message: "  Confirm Password:",
    validate: (value) => (value.length > 0 ? true : `Passwords do not match.`),
  },
  {
    type: "toggle",
    name: "choice",
    message: ``,
    active: "yes",
    inactive: "no",
    initial: true,
  },
  {
    type: "select",
    name: "select",
    message: "Select an option:",
    choices: [],
  },
  {
    type: "text",
    name: "text",
    message: "  ?:",
  },
];

export default runDialogue;
