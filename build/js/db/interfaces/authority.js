//+---------------------------------------------------------------------------------------+
//|                                                                          authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
exports.Publish = Publish;
exports.Key = Key;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
//+--------------------------------------------------------------------------------------+
//| Imports seed Privilege data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
const Import = () => {
    const Privileges = ["View", "Edit", "Create", "Delete", "Operate", "Configure"];
    Privileges.forEach((privilege, priority) => Publish({ privilege, priority }));
};
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds new Privileges to local database;                                                    |
//+--------------------------------------------------------------------------------------+
async function Publish(props) {
    const { privilege, priority } = props;
    const authority = await Key({ privilege });
    if (authority === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.authority VALUES (?, ?, ?)`, [key, privilege, priority]);
        return key;
    }
    return authority;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { authority, privilege } = props;
    const args = [];
    let sql = `SELECT privilege FROM blofin.authority WHERE `;
    if (authority) {
        args.push(authority);
        sql += `authority = ?`;
    }
    else if (privilege) {
        args.push(privilege);
        sql += `privilege = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.authority;
}
//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { authority, privilege } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.authority`;
    if (authority) {
        args.push(authority);
        sql += ` WHERE authority = ?`;
    }
    else if (privilege) {
        args.push(privilege);
        sql += ` WHERE privilege = ?`;
    }
    return (0, query_utils_1.Select)(sql, args);
}
