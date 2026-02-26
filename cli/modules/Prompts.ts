/**
 * @module Prompts-Engine
 * @description Centralized prompt definitions and execution wrapper.
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { Answers, PromptObject } from "prompts";
import prompts from "prompts";

/** Standard RFC 5322 compliant regex for email validation */
const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Standardized option format for Select and Multiselect prompts.
 */
export interface IOption {
  title: string;
  value: Uint8Array | string | number;
  choices?: Array<IOption>;
  func?: string;
  area?: string;
}

/**
 * Internal registry of reusable prompt templates.
 */
const __prompts: Array<PromptObject> = [
  {
    type: "text",
    name: "username",
    message: "  User Name:",
    validate: (value: string) => (value.length > 0 ? true : `Enter a valid username.`),
  },
  {
    /** Skips the email prompt if the previous entry (username) was already a valid email */
    type: (prev: string) => (regex.test(prev) ? null : "text"),
    name: "email",
    message: "  E-Mail:",
    validate: (value: string) => (regex.test(value) ? true : `Enter a valid email address.`),
  },
  {
    type: "password",
    name: "password",
    message: "  Password:",
    validate: (value: string) => (value.length > 0 ? true : `Enter a valid password.`),
  },
  {
    type: "password",
    name: "confirm",
    message: "  Confirm Password:",
    validate: (value: string) => (value.length > 0 ? true : `Passwords do not match.`),
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
  // In #cli/modules/Prompts.ts
{
  type: "autocomplete",
  name: "search",
  message: "  Search:",
  // 'suggest' is the engine that filters choices as the user types
  suggest: (input: string, choices: any[]) => 
    Promise.resolve(choices.filter(i => i.title.toLowerCase().includes(input.toLowerCase()))),
},

];

/**
 * Orchestrates and executes a sequence of prompts.
 * 
 * Looks up templates in the internal registry and overrides them 
 * with provided properties.
 * 
 * @param options - Array of prompt names (keys) to trigger.
 * @param props - Custom overrides for the prompts (e.g., specific messages or choices).
 * @returns An object containing the user's responses.
 */
const runDialogue = async (options: Array<string>, props?: Partial<PromptObject>) => {
  const dialogue: Array<PromptObject> = [];
  
  options.forEach((option) => {
    const basePrompt = __prompts.find(({ name }) => name === option);
    
    // Use 'as PromptObject' to satisfy the strict union type requirements
    const template: PromptObject = basePrompt 
      ? { ...basePrompt } 
      : { type: "text", name: option, message: `${option}:` };
    
    if (props) {
      Object.assign(template, props);
    }
    
    dialogue.push(template);
  });

  // Explicitly return the Answers type to the caller
  return await prompts(dialogue) as Answers<string>;
};

export default runDialogue;
