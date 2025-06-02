//+--------------------------------------------------------------------------------------+
//|                                                                              user.ts |
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
exports.menuDropUser = exports.menuEditUser = exports.menuCreateUser = exports.menuViewUser = exports.setPassword = exports.setCredentials = exports.setUser = exports.setUserToken = exports.UserToken = void 0;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
const console_log_colors_1 = require("console-log-colors");
const State_1 = require("@cli/modules/State");
const Header_1 = require("@cli/modules/Header");
const Users = __importStar(require("@db/interfaces/user"));
const Roles = __importStar(require("@db/interfaces/role"));
const userToken = { username: ``, title: ``, role: Buffer.from([0, 0, 0]), error: 0, message: `` };
const UserToken = () => {
    return userToken;
};
exports.UserToken = UserToken;
//+--------------------------------------------------------------------------------------+
//| Sets logged user token values;                                                       |
//+--------------------------------------------------------------------------------------+
const setUserToken = (token) => {
    Object.assign(userToken, Object.assign({}, token));
};
exports.setUserToken = setUserToken;
//+--------------------------------------------------------------------------------------+
//| Retrieves the authorized role assignments in prompt format;                          |
//+--------------------------------------------------------------------------------------+
const setFields = async (props) => {
    const roles = await setRole(props);
    const { role, title } = roles;
    const states = await (0, State_1.setState)(props);
    const { state, status } = states;
    const images = (props === null || props === void 0 ? void 0 : props.image_url) && (await (0, Prompts_1.default)(["text"], { message: "Edit image?", initial: props === null || props === void 0 ? void 0 : props.image_url }));
    const image_url = (images === null || images === void 0 ? void 0 : images.value) ? images.value : ``;
    return { role, title, state, status, image_url };
};
//+--------------------------------------------------------------------------------------+
//| Retrieves users in prompt format;                                                    |
//+--------------------------------------------------------------------------------------+
const setUser = async (props) => {
    const users = await Users.Fetch(props);
    const choices = [];
    if (users) {
        users.forEach((option) => {
            choices.push({
                title: option === null || option === void 0 ? void 0 : option.username,
                value: option === null || option === void 0 ? void 0 : option.user,
            });
        });
        const { select } = await (0, Prompts_1.default)(["select"], { message: "  Who owns the account?", choices });
        const choice = choices.find(({ value }) => value.toString() === select.toString());
        return { user: choice.value, username: choice.title };
    }
};
exports.setUser = setUser;
//+--------------------------------------------------------------------------------------+
//| Retrieves the authorized role assignments in prompt format;                          |
//+--------------------------------------------------------------------------------------+
const setRole = async (props) => {
    const roles = await Roles.Fetch({});
    const choices = [];
    if (roles) {
        const userAuth = userToken.title || "Admin";
        const roleAuth = roles.find(({ title }) => title === userAuth);
        if (props === null || props === void 0 ? void 0 : props.role)
            return roles.find(({ role }) => role.toString() === props.role.toString());
        if (props === null || props === void 0 ? void 0 : props.title)
            return roles.find(({ title }) => title === props.title);
        if (roleAuth) {
            roles.forEach((option) => {
                if (roleAuth.auth_rank >= option.auth_rank) {
                    choices.push({
                        title: option.title,
                        value: option.role,
                    });
                }
            });
            const { select } = await (0, Prompts_1.default)(["select"], { message: "  Select a Role:", choices });
            const choice = choices.find(({ value }) => value.toString() === select.toString());
            return { role: choice.value, title: choice.title };
        }
    }
};
//+--------------------------------------------------------------------------------------+
//| Performs light validation on prompted user credentials; more tightening expected;    |
//+--------------------------------------------------------------------------------------+
const setCredentials = async (newUser = false, props) => {
    const credentials = await (0, Prompts_1.default)(["username", "email"]);
    let { username, email } = credentials;
    if (username) {
        if (username.indexOf("@") > 0) {
            email = username;
            username = username.slice(0, username.indexOf("@"));
        }
        if (email) {
            const fields = newUser && (await setFields(props));
            Object.assign(credentials, { username, email, verify: newUser });
            const { password, verified } = await (0, exports.setPassword)(credentials);
            if (newUser && verified) {
                Object.assign(credentials, Object.assign(Object.assign({}, credentials), fields));
                const result = await Users.Add(Object.assign(Object.assign({}, credentials), { password }));
                (0, exports.setUserToken)(result);
            }
            return verified;
        }
    }
    (0, exports.setUserToken)({ error: 401, message: "Operation canceled." });
    return false;
};
exports.setCredentials = setCredentials;
//+--------------------------------------------------------------------------------------+
//| Password dialogue handler; strong confirmation checks on adds/sets/resets;           |
//+--------------------------------------------------------------------------------------+
const setPassword = async (props) => {
    const { username, email } = props;
    if (props.verify)
        do {
            const { password, confirm } = await (0, Prompts_1.default)(["password", "confirm"]);
            if (password === confirm)
                return { password, verified: true };
            const { choice } = await (0, Prompts_1.default)(["choice"], { message: "  Passwords are not the same. Try again?", active: "No", inactive: "Yes", initial: false });
            if (choice) {
                (0, exports.setUserToken)({ error: 303, message: "Invalid user credentials." });
                return { verified: false };
            }
        } while (true);
    else {
        const { password } = await (0, Prompts_1.default)(["password"]);
        const result = await Users.Login({ username, email, password });
        (0, exports.setUserToken)(result);
        return { verified: true };
    }
};
exports.setPassword = setPassword;
//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
const menuViewUser = async () => {
    (0, Header_1.setHeader)("View Users");
    console.log(`\n✔️ `, `${(0, console_log_colors_1.bold)("User Name".padEnd(16, " "))}`, `${(0, console_log_colors_1.bold)("E-Mail Address".padEnd(24, " "))}`, `${(0, console_log_colors_1.bold)("Title".padEnd(10, " "))}`, `${(0, console_log_colors_1.bold)("Status".padEnd(12, " "))}`, `${(0, console_log_colors_1.bold)("Image Location".padEnd(36, " "))}`, `${(0, console_log_colors_1.bold)("Created".padEnd(12, " "))}`, `${(0, console_log_colors_1.bold)("Updated".padEnd(12, " "))}`);
    (await Users.Fetch({})).forEach((user) => {
        const { username, email, title, status, image_url, create_time, update_time } = user;
        console.log(`${status === "Enabled" ? "🔹" : "🔸"}`, `${username.padEnd(16, " ")}`, `${email.padEnd(24, " ")}`, `${title.padEnd(10, " ")}`, `${status === "Enabled" ? (0, console_log_colors_1.cyan)(status.padEnd(12, " ")) : status === "Disabled" ? (0, console_log_colors_1.red)(status.padEnd(12, " ")) : (0, console_log_colors_1.yellow)(status.padEnd(12, " "))}`, `${image_url.padEnd(36, " ")}`, `${create_time.toLocaleDateString().padEnd(12, " ")}`, `${update_time.toLocaleDateString().padEnd(12, " ")}`);
    });
    console.log(``);
    const { choice } = await (0, Prompts_1.default)(["choice"], { message: ">", active: "Refresh", inactive: "Finished", initial: false });
};
exports.menuViewUser = menuViewUser;
//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
const menuCreateUser = async () => {
    (0, Header_1.setHeader)("Create User");
    await (0, exports.setCredentials)(true);
};
exports.menuCreateUser = menuCreateUser;
//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
const menuEditUser = async () => {
    (0, Header_1.setHeader)("Edit User");
};
exports.menuEditUser = menuEditUser;
//+--------------------------------------------------------------------------------------+
//| Presents the user view;                                                              |
//+--------------------------------------------------------------------------------------+
const menuDropUser = async () => {
    (0, Header_1.setHeader)("Drop User");
};
exports.menuDropUser = menuDropUser;
exports.default = exports.UserToken;
