//+--------------------------------------------------------------------------------------+
//|                                                                              User.ts |
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
exports.setMenu = void 0;
const user_1 = __importDefault(require("@cli/interfaces/user"));
const RoleAuths = __importStar(require("@db/interfaces/role_authority"));
//+--------------------------------------------------------------------------------------+
//| Creates the authorized menus based on the connected user role;                       |
//+--------------------------------------------------------------------------------------+
const setMenu = async () => {
    const menu = [];
    const auths = await RoleAuths.FetchSubjects({ role: (0, user_1.default)().role });
    for (let key = 0; key < auths.length; key++) {
        const { role, subject, area } = auths[key];
        const privs = await RoleAuths.FetchPrivileges({ role, subject, enabled: true });
        const submenu = privs.map((priv) => ({
            title: priv.privilege,
            value: priv.authority,
            choices: [],
            func: `menu${priv.privilege}('${area}')`,
        }));
        submenu.push({ title: "Back", value: Buffer.from([0, 0, 0]), choices: [], func: `` });
        menu.push({ title: area, value: subject, choices: submenu });
    }
    menu.push({ title: "End Session", value: Buffer.from([0, 0, 0]), choices: [] });
    return menu;
};
exports.setMenu = setMenu;
