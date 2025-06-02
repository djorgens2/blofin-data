//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuDropAccount = exports.menuEditAccount = exports.menuCreateAccount = exports.menuViewAccount = exports.setAccount = void 0;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
const console_log_colors_1 = require("console-log-colors");
const std_util_1 = require("@lib/std.util");
const Header_1 = require("@cli/modules/Header");
const State_1 = require("@cli/modules/State");
const broker_1 = require("@cli/interfaces/broker");
const user_1 = require("@cli/interfaces/user");
const Environ_1 = require("@cli/modules/Environ");
const Accounts = __importStar(require("@db/interfaces/account"));
//+--------------------------------------------------------------------------------------+
//| Retrieves accounts from local server; if new, prompts to create;                     |
//+--------------------------------------------------------------------------------------+
const setAccount = async (props) => {
    const alias = await (0, Prompts_1.default)(["text"], { name: "alias", message: "  Nickname for Account?", initial: (props === null || props === void 0 ? void 0 : props.alias) ? props === null || props === void 0 ? void 0 : props.alias : `` });
    const owner = await (0, user_1.setUser)({ title: "Admin" });
    const broker = await (0, broker_1.setBroker)();
    const state = await (0, State_1.setState)({});
    const environ = await (0, Environ_1.setEnviron)({});
    const wss_url = await (0, Prompts_1.default)(["text"], { name: "wss_url", message: "  Websocket URL:", initial: (props === null || props === void 0 ? void 0 : props.wss_url) ? props === null || props === void 0 ? void 0 : props.wss_url : `` });
    const rest_api_url = await (0, Prompts_1.default)(["text"], {
        name: "rest_api_url",
        message: "  Public REST API URL:",
        initial: (props === null || props === void 0 ? void 0 : props.rest_api_url) ? props === null || props === void 0 ? void 0 : props.rest_api_url : ``,
    });
    const api = (props === null || props === void 0 ? void 0 : props.api) === undefined ? await (0, Prompts_1.default)(["text"], { name: "api", message: "  API Key:" }) : { api: props.api };
    const key = (props === null || props === void 0 ? void 0 : props.key) === undefined ? await (0, Prompts_1.default)(["text"], { name: "key", message: "  Secret Key:" }) : { key: props.key };
    const phrase = (props === null || props === void 0 ? void 0 : props.phrase) === undefined ? await (0, Prompts_1.default)(["text"], { name: "phrase", message: "  Passphrase:" }) : { phrase: props.phrase };
    console.log(``);
    const { choice } = await (0, Prompts_1.default)(["choice"], {
        message: `  `,
        active: "Accept",
        inactive: "Cancel",
        initial: true,
    });
    if (choice) {
        await Accounts.Add(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, alias), owner), broker), state), environ), wss_url), rest_api_url), api), key), phrase));
    }
};
exports.setAccount = setAccount;
//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
const menuViewAccount = async () => {
    (0, Header_1.setHeader)("View Accounts");
    console.log(`\n✔️ `, `${(0, console_log_colors_1.bold)("Job Name".padEnd(16, " "))}`, `${(0, console_log_colors_1.bold)("Account Holder".padEnd(20, " "))}`, `${(0, console_log_colors_1.bold)("Environment".padEnd(16, " "))}`, `${(0, console_log_colors_1.bold)("Status".padEnd(12, " "))}`, `${(0, console_log_colors_1.bold)("Web Socket Address".padEnd(52, " "))}`, `${(0, console_log_colors_1.bold)("REST API Address".padEnd(52, " "))}`, `${(0, console_log_colors_1.bold)("Available".padEnd(12, " "))}`);
    (await Accounts.Fetch({})).forEach((account) => {
        const { alias, owner_name, environ, status, wss_url, rest_api_url } = account;
        const available = "No";
        console.log(`${status === "Enabled" ? "🔹" : "🔸"} `, `${alias.padEnd(16, " ")}`, `${owner_name.padEnd(20, " ")}`, `${environ.padEnd(16, " ")}`, `${status === "Enabled" ? (0, console_log_colors_1.cyan)(status.padEnd(12, " ")) : status === "Disabled" ? (0, console_log_colors_1.red)(status.padEnd(12, " ")) : (0, console_log_colors_1.yellow)(status.padEnd(12, " "))}`, `${wss_url.padEnd(52, " ")}`, `${rest_api_url.padEnd(52, " ")}`, `   ${available.padEnd(12, " ")}`);
    });
    console.log(``);
    const { choice } = await (0, Prompts_1.default)(["choice"], { message: "  ", active: "Refresh", inactive: "Finished", initial: false });
};
exports.menuViewAccount = menuViewAccount;
//+--------------------------------------------------------------------------------------+
//| Presents the Imports view;                                                           |
//+--------------------------------------------------------------------------------------+
const setImports = async (imports) => {
    for (let id = 0; id < imports.length; id++) {
        const { alias, api, key, phrase, wss_url, rest_api_url } = imports[id];
        console.log(`\n >>> ${(0, console_log_colors_1.green)("Imports")}: ${(0, console_log_colors_1.bold)(id + 1)} of ${(0, console_log_colors_1.bold)(imports.length)}\n`);
        alias && console.log(`            ${(0, console_log_colors_1.yellow)("Alias")}: ${(0, console_log_colors_1.dim)(alias)}`);
        api && console.log(`         ${(0, console_log_colors_1.yellow)("API Key")}: ${(0, console_log_colors_1.dim)(api)}`);
        key && console.log(`     ${(0, console_log_colors_1.yellow)("Private Key")}: ${(0, console_log_colors_1.dim)(key)}`);
        phrase && console.log(`          ${(0, console_log_colors_1.yellow)("Phrase")}: ${(0, console_log_colors_1.dim)(phrase)}`);
        wss_url && console.log(`      ${(0, console_log_colors_1.yellow)("Socket URL")}: ${(0, console_log_colors_1.dim)(wss_url)}`);
        rest_api_url && console.log(`         ${(0, console_log_colors_1.yellow)("API URL")}: ${(0, console_log_colors_1.dim)(rest_api_url)}`);
        console.log(" ");
        await (0, exports.setAccount)(imports[id]);
    }
};
//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
const menuCreateAccount = async () => {
    (0, Header_1.setHeader)("Create Account");
    const imports = await Accounts.Import();
    if (imports.length > 0) {
        const { choice } = await (0, Prompts_1.default)(["choice"], {
            message: `  New account${imports.length > 1 ? "s" : ``} detected; configure now?`,
            active: "Yes",
            inactive: "No",
            initial: true,
        });
        if (choice) {
            await setImports(imports);
        }
        else {
            await (0, std_util_1.Pause)("Really?");
        }
    }
    else
        await (0, exports.setAccount)({});
};
exports.menuCreateAccount = menuCreateAccount;
//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
const menuEditAccount = async () => {
    (0, Header_1.setHeader)("Edit User");
};
exports.menuEditAccount = menuEditAccount;
//+--------------------------------------------------------------------------------------+
//| Presents the Account view;                                                           |
//+--------------------------------------------------------------------------------------+
const menuDropAccount = async () => {
    (0, Header_1.setHeader)("Drop User");
};
exports.menuDropAccount = menuDropAccount;
