//+--------------------------------------------------------------------------------------+
//|                                                                           app-cli.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setHeader = void 0;
const console_log_colors_1 = require("console-log-colors");
const user_1 = __importDefault(require("@cli/interfaces/user"));
//+--------------------------------------------------------------------------------------+
//| Displays beautiful header   ;-)                                                      |
//+--------------------------------------------------------------------------------------+
const setHeader = (heading) => {
    const { username, title, error, message } = (0, user_1.default)();
    const page = `**** ${heading} ****`.padStart((120 - heading.length) / 2, " ");
    const color = error === 0
        ? `${(0, console_log_colors_1.green)("Success:")} `
        : error < 200
            ? `${(0, console_log_colors_1.cyan)(" Confirmed:")} `
            : error < 300
                ? `${(0, console_log_colors_1.yellow)("*** Warning:")} `
                : error < 400
                    ? `${(0, console_log_colors_1.red)("*** Error:")} `
                    : ``;
    console.clear();
    console.log(`${'+'.padEnd(132, '-')}+`);
    console.log(`|`);
    console.log(`|`, (0, console_log_colors_1.cyan)(page));
    console.log(`|`);
    console.log(`|    `, (0, console_log_colors_1.bold)(`Log Time:`), (0, console_log_colors_1.dim)(new Date().toLocaleString()));
    username.length === 0 ? console.log(`|`) : console.log(`|        User: ${(0, console_log_colors_1.green)(username)}`);
    title.length === 0 ? console.log(`|`) : console.log(`|        Role: ${(0, console_log_colors_1.green)(title)}`);
    console.log(`|`);
    console.log(`|     ${color} ${message}`);
    console.log(`|`);
    console.log(`${'+'.padEnd(132, '-')}+`);
    console.log(``);
};
exports.setHeader = setHeader;
