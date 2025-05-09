import prompts from "prompts";

import type { IRole } from "@db/interfaces/role";
import type { IBroker } from "@db/interfaces/broker";
import { Role } from "@db/interfaces/role";

import * as Brokerss from "@db/interfaces/broker";
import * as Roles from "@db/interfaces/role";

interface PromptOptions {
  type: "text" | "select" | "multiselect" | "number" | "confirm";
  name: string;
  message: string;
  choices?: { title: string; value: any }[];
}

async function runPrompt(options: PromptOptions[]) {
  const response = await prompts(options);
  return response;
}

const brokerOptions: Array<IBroker> = async() => {};
const accountOptions = Array<IAccount> = async() => {};
const roleOptions: Array<IRole> = async() => {
    const options = await Roles.Fetch({});
}

async function main() {
  const dynamicOptions: PromptOptions[] = [
    {
      type: "text",
      name: "name",
      message: "What is your name?",
    },
    {
      type: "select",
      name: "favoriteColor",
      message: "What is your favorite color?",
      choices: [
        { title: "Red", value: "red" },
        { title: "Green", value: "green" },
        { title: "Blue", value: "blue" },
      ],
    },
    {
      type: "number",
      name: "age",
      message: "What is your age?",
    },
  ];

  const answers = await runPrompt(dynamicOptions);
  console.log("Answers:", answers);
}

main();
