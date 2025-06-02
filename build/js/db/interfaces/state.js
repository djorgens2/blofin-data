//+---------------------------------------------------------------------------------------+
//|                                                                              state.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = exports.States = exports.Status = void 0;
exports.Publish = Publish;
exports.Key = Key;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
exports.Status = {
    Enabled: "Enabled",
    Disabled: "Disabled",
    Halted: "Halted",
    Restricted: "Restricted",
    Suspended: "Suspended",
    Deleted: "Deleted",
    Expired: "Expired",
};
exports.States = [
    { status: "Enabled", description: "Enabled for trading" },
    { status: "Disabled", description: "Disabled from trading" },
    { status: "Halted", description: "Adverse event halt" },
    { status: "Restricted", description: "Restricted use" },
    { status: "Suspended", description: "Suspended by broker" },
    { status: "Deleted", description: "Deleted pending removal" },
    { status: "Expired", description: "Expired" },
];
//+--------------------------------------------------------------------------------------+
//| Imports seed States to define accounts/trading operational status;                   |
//+--------------------------------------------------------------------------------------+
const Import = () => exports.States.forEach((state) => Publish(state));
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds new States to local database;                                                   |
//+--------------------------------------------------------------------------------------+
async function Publish(props) {
    const { status, description } = props;
    const state = await Key({ status });
    if (state === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.state VALUES (?, ?, ?)`, [key, status, description]);
        return key;
    }
    return state;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { status, state } = props;
    const args = [];
    let sql = `SELECT state FROM blofin.state WHERE `;
    if (state) {
        args.push(state);
        sql += `state = ?`;
    }
    else if (status) {
        args.push(status);
        sql += `status = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.state;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { state, status } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.state`;
    if (state) {
        args.push(state);
        sql += ` WHERE state = ?`;
    }
    else if (status) {
        args.push(status);
        sql += ` WHERE status = ?`;
    }
    return (0, query_utils_1.Select)(sql, args);
}
