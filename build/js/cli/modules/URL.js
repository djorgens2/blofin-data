//+--------------------------------------------------------------------------------------+
//|                                                                           Environ.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUrl = void 0;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
//+--------------------------------------------------------------------------------------+
//| Retrieves environment assignments in prompt format;                                  |
//+--------------------------------------------------------------------------------------+
const setUrl = async (props) => {
    const choices = [];
    const url = await (0, Prompts_1.default)(["text"], { message: props.message, initial: props.initial });
    const verified = await checkURL(url.value);
    return { url, verified };
};
exports.setUrl = setUrl;
//+--------------------------------------------------------------------------------------+
//| Retrieves environment assignments in prompt format;                                  |
//+--------------------------------------------------------------------------------------+
async function checkURL(url) {
    try {
        const response = await fetch(url, { mode: "no-cors" });
        if (response.status === 200) {
            console.log(`URL "${url}" is online.`);
        }
        else {
            console.log(`URL "${url}" is online but returned status ${response.status}.`);
        }
    }
    catch (error) {
        console.log(`URL "${url}" is offline or an error occurred:`, error);
    }
}
