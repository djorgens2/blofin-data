//+---------------------------------------------------------------------------------------+
//|                                                                               role.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
exports.Publish = Publish;
exports.Key = Key;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("lib/crypto.util");
//+--------------------------------------------------------------------------------------+
//| Imports seed Role data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
const Import = () => {
    const Roles = [
        { title: "Admin", auth_rank: 40, },
        { title: "Editor", auth_rank: 20 },
        { title: "Operator", auth_rank: 30 },
        { title: "Viewer", auth_rank: 10 },
    ];
    Roles.forEach((role) => Publish(role));
};
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds new Roles to local database;                                                    |
//+--------------------------------------------------------------------------------------+
async function Publish(props) {
    const { role, title, auth_rank } = props;
    role === undefined && title && (await Key({ title }));
    if (role === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.role VALUES (?, ?, ?)`, [key, title, auth_rank]);
        return key;
    }
    return role;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { role, title } = props;
    const args = [];
    let sql = `SELECT role FROM blofin.role WHERE `;
    if (role) {
        args.push(role);
        sql += `role = ?`;
    }
    else if (title) {
        args.push(title);
        sql += `title = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.role;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { role, title } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.role`;
    if (role) {
        args.push(role);
        sql += ` WHERE role = ?`;
    }
    else if (title) {
        args.push(title);
        sql += ` WHERE title = ?`;
    }
    return (0, query_utils_1.Select)(sql, args);
}
