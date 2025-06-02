//+--------------------------------------------------------------------------------------+
//|                                                                       environment.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
exports.Add = Add;
exports.Key = Key;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("lib/crypto.util");
//+--------------------------------------------------------------------------------------+
//| Imports period seed data to the database;                                            |
//+--------------------------------------------------------------------------------------+
const Import = async () => {
    ["Production", "Development", "Test"].forEach((environ) => Add(environ));
};
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds seed environments to local database;                                            |
//+--------------------------------------------------------------------------------------+
async function Add(environ) {
    const environment = await Key({ environ });
    if (environment === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.environment VALUES (?, ?)`, [key, environ]);
        return key;
    }
    return environment;
}
//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { environment, environ } = props;
    const args = [];
    let sql = `SELECT environment FROM blofin.environment WHERE `;
    if (environment) {
        args.push(environment);
        sql += `environment = ?`;
    }
    else if (environ) {
        args.push(environ);
        sql += `environ = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.environment;
}
//+--------------------------------------------------------------------------------------+
//| Examines environment search methods in props; executes once on supplied keys;        |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { environment, environ } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.environment`;
    if (environment) {
        args.push(environment);
        sql += ` WHERE environment = ?`;
    }
    else if (environ) {
        args.push(environ);
        sql += ` WHERE environ = ?`;
    }
    return await (0, query_utils_1.Select)(sql, args);
}
