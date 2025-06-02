//+--------------------------------------------------------------------------------------+
//|                                                                             logon.ts |
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
exports.Logon = void 0;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
const user_1 = __importDefault(require("@cli/interfaces/user"));
const Header_1 = require("@cli/modules/Header");
const user_2 = require("@cli/interfaces/user");
const Users = __importStar(require("@db/interfaces/user"));
//+--------------------------------------------------------------------------------------+
//| Login validator and configuration script;                                            |
//+--------------------------------------------------------------------------------------+
const Logon = async () => {
    const { total_users } = await Users.Count({ title: "Admin", status: "Enabled" });
    if (total_users > 0) {
        (0, user_2.setUserToken)({ error: 500, message: "Please enter your Username and Password." });
        (0, Header_1.setHeader)("Main Login");
        await (0, user_2.setCredentials)();
    }
    else {
        (0, user_2.setUserToken)({ error: 201, message: "This procedure will create an Administrator account." });
        (0, Header_1.setHeader)("Application Setup");
        const { choice } = await (0, Prompts_1.default)(["choice"], { message: "Administrator account not found. Create one now?", active: "Yes", inactive: "No", initial: true });
        if (choice) {
            if (await (0, user_2.setCredentials)(true, { title: "Admin", status: "Enabled" })) {
                (0, user_2.setUserToken)({ error: 101, message: "User added. Application restart required." });
            }
            else
                (0, user_2.setUserToken)({ error: 401, message: "Operation canceled." });
            (0, Header_1.setHeader)(" Application Restart Required");
            process.exit((0, user_1.default)().error);
        }
    }
};
exports.Logon = Logon;
