//+--------------------------------------------------------------------------------------+
//|                                                                           Prompts.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prompts_1 = __importDefault(require("prompts"));
const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//+--------------------------------------------------------------------------------------+
//| Runs the prompt/prompts (if chained);                                                |
//+--------------------------------------------------------------------------------------+
const runDialogue = async (options, props) => {
    __dialogue.length = 0;
    options.forEach((option) => {
        const __prompt = __prompts.find(({ name }) => name === option) ? __prompts.find(({ name }) => name === option) : { type: "text" };
        props && Object.assign(__prompt, Object.assign(Object.assign({}, __prompt), props));
        __prompt && __dialogue.push(__prompt);
    });
    const response = await (0, prompts_1.default)(__dialogue);
    return response;
};
const __dialogue = [];
const __prompts = [
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
exports.default = runDialogue;
