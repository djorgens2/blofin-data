//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
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
exports.menuDropBroker = exports.menuEditBroker = exports.menuCreateBroker = exports.menuViewBroker = exports.setBroker = void 0;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
const Header_1 = require("@cli/modules/Header");
const console_log_colors_1 = require("console-log-colors");
const Brokers = __importStar(require("@db/interfaces/broker"));
//+--------------------------------------------------------------------------------------+
//| Retrieves broker assignments in prompt format;                                       |
//+--------------------------------------------------------------------------------------+
const setBroker = async () => {
    const count = async () => {
        const brokers = await Brokers.Fetch({});
        if (brokers.length === 0) {
            await Brokers.Import();
            return 1;
        }
        return brokers.length;
    };
    await count();
    const brokers = await Brokers.Fetch({});
    const choices = [];
    if (brokers) {
        brokers.forEach((option) => {
            choices.push({
                title: option.name,
                value: option.broker,
            });
        });
        const { select } = await (0, Prompts_1.default)(["select"], { message: "  Select a Broker:", choices });
        const choice = choices.find(({ value }) => value.toString() === select.toString());
        return { broker: choice.value, name: choice.title };
    }
};
exports.setBroker = setBroker;
//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
const menuViewBroker = async () => {
    (0, Header_1.setHeader)("View Accounts");
    console.log(`\n✔️ `, `${(0, console_log_colors_1.bold)("Broker".padEnd(32, " "))}`, `${(0, console_log_colors_1.bold)("Alias".padEnd(16, " "))}`, `${(0, console_log_colors_1.bold)("Owner".padEnd(10, " "))}`, `${(0, console_log_colors_1.bold)("name".padEnd(12, " "))}`, `${(0, console_log_colors_1.bold)("Websocket Address".padEnd(36, " "))}`, `${(0, console_log_colors_1.bold)("REST API Address".padEnd(36, " "))}`, `${(0, console_log_colors_1.bold)("Installed".padEnd(12, " "))}`);
    (await Brokers.Fetch({})).forEach((account) => {
        const { broker_name, short_name, owner_name, status, wss_url, rest_api_url } = account;
        const installed = "No";
        console.log(`${status === "Enabled" ? "🔹" : "🔸"}`, `${broker_name.padEnd(32, " ")}`, `${owner_name.padEnd(24, " ")}`, `${status === "Enabled" ? (0, console_log_colors_1.cyan)(status.padEnd(12, " ")) : status === "Disabled" ? (0, console_log_colors_1.red)(status.padEnd(12, " ")) : (0, console_log_colors_1.yellow)(status.padEnd(12, " "))}`, `${wss_url.padEnd(36, " ")}`, `${rest_api_url.padEnd(36, " ")}`, `${installed.padEnd(12, " ")}`);
    });
    console.log(``);
    const { choice } = await (0, Prompts_1.default)(["choice"], { message: ">", active: "Refresh", inactive: "Finished", initial: false });
};
exports.menuViewBroker = menuViewBroker;
//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
const menuCreateBroker = async () => {
    (0, Header_1.setHeader)("Create Broker");
    //  await setCredentials(true);
};
exports.menuCreateBroker = menuCreateBroker;
//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
const menuEditBroker = async () => {
    (0, Header_1.setHeader)("Edit Broker");
};
exports.menuEditBroker = menuEditBroker;
//+--------------------------------------------------------------------------------------+
//| Presents the broker view;                                                            |
//+--------------------------------------------------------------------------------------+
const menuDropBroker = async () => {
    (0, Header_1.setHeader)("Drop Broker");
};
exports.menuDropBroker = menuDropBroker;
