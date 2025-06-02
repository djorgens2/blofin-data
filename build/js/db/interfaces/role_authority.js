//+---------------------------------------------------------------------------------------+
//|                                                                     role_authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
exports.Disable = Disable;
exports.Enable = Enable;
exports.Fetch = Fetch;
exports.FetchSubjects = FetchSubjects;
exports.FetchPrivileges = FetchPrivileges;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
const Role = __importStar(require("@db/interfaces/role"));
const Authority = __importStar(require("@db/interfaces/authority"));
const Subject = __importStar(require("@db/interfaces/subject"));
//+--------------------------------------------------------------------------------------+
//| Imports all role access privileges with the supplied state; ** Admin Use Only;       |
//+--------------------------------------------------------------------------------------+
const Import = async (props) => {
    const imports = await (0, query_utils_1.Select)(`SELECT subject, role, authority FROM blofin.subject, blofin.role, blofin.authority`, []);
    for (let key = 0; key < imports.length; key++) {
        Object.assign(imports[key], Object.assign(Object.assign(Object.assign({}, imports[key]), { role_authority: (0, crypto_util_1.hashKey)(6) }), props));
        const { role_authority, subject, role, authority, enabled } = imports[key];
        await (0, query_utils_1.Modify)(`INSERT IGNORE INTO blofin.role_authority VALUES ( ?, ?, ?, ?, ?)`, [role_authority, subject, role, authority, enabled]);
    }
};
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Disables authority based on supplied properties;                                     |
//+--------------------------------------------------------------------------------------+
async function Disable(props) {
    const { where, args } = await setWhere(props);
    const sql = `UPDATE blofin.role_authority SET enabled = false`.concat(where);
    const result = await (0, query_utils_1.Modify)(sql, args);
    return result.affectedRows;
}
//+--------------------------------------------------------------------------------------+
//| Enables authority based on supplied properties;                                      |
//+--------------------------------------------------------------------------------------+
async function Enable(props) {
    const { where, args } = await setWhere(props);
    const sql = `UPDATE blofin.role_authority SET enabled = true`.concat(where);
    const result = await (0, query_utils_1.Modify)(sql, args);
    return result.affectedRows;
}
//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { where, args } = await setWhere(props);
    const sql = `SELECT * FROM blofin.role_authority`.concat(where);
    return (0, query_utils_1.Select)(sql, args);
}
//+--------------------------------------------------------------------------------------+
//| Returns formatted where and args;                                                    |
//+--------------------------------------------------------------------------------------+
const setWhere = async (props) => {
    const { area, title, privilege, enabled } = props;
    const subject = props.subject ? props.subject : await Subject.Key({ area });
    const role = props.role ? props.role : await Role.Key({ title });
    const authority = props.authority ? props.authority : await Authority.Key({ privilege });
    const args = [];
    const filters = [];
    if (role) {
        args.push(role);
        filters.push(`role = ?`);
    }
    if (subject) {
        args.push(subject);
        filters.push(`subject = ?`);
    }
    if (authority) {
        args.push(authority);
        filters.push(`authority = ?`);
    }
    if (enabled) {
        args.push(enabled);
        filters.push(`enabled = ?`);
    }
    let where = "";
    filters.forEach((filter, id) => (where += (id ? " AND " : " WHERE ") + filter));
    return { where, args };
};
//----------------------------------- views ------------------------------------------------------------------//
//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
async function FetchSubjects(props) {
    const { where, args } = await setWhere(props);
    const sql = `SELECT * FROM blofin.vw_role_subjects`.concat(where);
    return (0, query_utils_1.Select)(sql, args);
}
//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
async function FetchPrivileges(props) {
    const { where, args } = await setWhere(props);
    const sql = `SELECT * FROM blofin.vw_role_privileges`.concat(where);
    return (0, query_utils_1.Select)(sql, args);
}
