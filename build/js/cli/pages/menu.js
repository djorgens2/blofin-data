//+--------------------------------------------------------------------------------------+
//|                                                                              menu.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Menu = exports.menuOperate = exports.menuConfigure = exports.menuDrop = exports.menuCreate = exports.menuEdit = exports.menuView = void 0;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
const Header_1 = require("@cli/modules/Header");
const Menu_1 = require("@cli/modules/Menu");
const user_1 = require("@cli/interfaces/user");
const account_1 = require("@cli/interfaces/account");
//+--------------------------------------------------------------------------------------+
//| View menu; displays the rows for the supplied subject area;                          |
//+--------------------------------------------------------------------------------------+
const menuView = async (area) => {
    switch (area) {
        case "User":
            await (0, user_1.menuViewUser)();
            break;
        case "Account":
            await (0, account_1.menuViewAccount)();
            break;
        default:
            console.log(`${area} not enabled.`);
    }
};
exports.menuView = menuView;
//+--------------------------------------------------------------------------------------+
//| Edit menu; lists rows for supplied subject area; runs editor on mutable fields;      |
//+--------------------------------------------------------------------------------------+
const menuEdit = async (area) => {
    switch (area) {
        case "User":
            await (0, user_1.menuEditUser)();
        default:
            console.log(`${area} not enabled.`);
    }
};
exports.menuEdit = menuEdit;
//+--------------------------------------------------------------------------------------+
//| Create menu; opens the create dialogue for the supplied area;                        |
//+--------------------------------------------------------------------------------------+
const menuCreate = async (area) => {
    switch (area) {
        case "User":
            await (0, user_1.menuCreateUser)();
            break;
        case "Account":
            await (0, account_1.menuCreateAccount)();
            break;
        default:
            console.log(`${area} not enabled.`);
    }
};
exports.menuCreate = menuCreate;
//+--------------------------------------------------------------------------------------+
//| Drop menu; opens the drop dialogue for the supplied area;                            |
//+--------------------------------------------------------------------------------------+
const menuDrop = async (area) => {
    switch (area) {
        case "User":
            await (0, user_1.menuDropUser)();
        default:
            console.log(`${area} not enabled.`);
    }
};
exports.menuDrop = menuDrop;
//+--------------------------------------------------------------------------------------+
//| Configuration menu; opens the configuration dialogue for the supplied area;          |
//+--------------------------------------------------------------------------------------+
const menuConfigure = async (area) => {
    switch (area) {
        default:
            console.log(`${area} not enabled.`);
    }
};
exports.menuConfigure = menuConfigure;
//+--------------------------------------------------------------------------------------+
//| Operations menu; opens the operations dialogue for the supplied area;                |
//+--------------------------------------------------------------------------------------+
const menuOperate = async (area) => {
    switch (area) {
        default:
            console.log(`${area} not enabled.`);
    }
};
exports.menuOperate = menuOperate;
//+--------------------------------------------------------------------------------------+
//| Main menu setup/config script;                                                       |
//+--------------------------------------------------------------------------------------+
const Menu = async () => {
    do {
        (0, Header_1.setHeader)(`Main Menu`);
        const menu = await (0, Menu_1.setMenu)();
        const { select } = await (0, Prompts_1.default)(["select"], { message: " Main Menu:", choices: menu });
        const key = select ? select : Buffer.from([0, 0, 0]);
        const option = menu.find(({ value }) => value.toString() === key.toString());
        switch (option === null || option === void 0 ? void 0 : option.title) {
            case "End Session": {
                console.clear();
                console.log("Session ended.");
                process.exit(0);
            }
            default: {
                const { select } = await (0, Prompts_1.default)(["select"], { message: " Authorized options:", choices: option === null || option === void 0 ? void 0 : option.choices });
                const key = select ? select : Buffer.from([0, 0, 0]);
                const suboption = option === null || option === void 0 ? void 0 : option.choices.find(({ value }) => value.toString() === key.toString());
                (suboption === null || suboption === void 0 ? void 0 : suboption.func) && (await eval(suboption === null || suboption === void 0 ? void 0 : suboption.func));
            }
        }
    } while (true);
};
exports.Menu = Menu;
