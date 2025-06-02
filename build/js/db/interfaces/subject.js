//+---------------------------------------------------------------------------------------+
//|                                                                            subject.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = exports.SubjectAreas = exports.SubjectArea = void 0;
exports.Publish = Publish;
exports.Key = Key;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
exports.SubjectArea = {
    Period: "Period",
    Instrument: "Instrument",
    Currency: "Currency",
    State: "State",
    Contract: "Contract",
    Broker: "Broker",
    Account: "Account",
    User: "User",
};
exports.SubjectAreas = ["Period", "Instrument", "Currency", "State", "Contract", "Broker", "Account", "User"];
//+--------------------------------------------------------------------------------------+
//| Imports seed Subject data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
const Import = () => exports.SubjectAreas.forEach((area) => Publish(area));
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds new subjects to local database;                                                    |
//+--------------------------------------------------------------------------------------+
async function Publish(area) {
    const subject = await Key({ area });
    if (subject === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.subject VALUES (?, ?)`, [key, area]);
        return key;
    }
    return subject;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { subject, area } = props;
    const args = [];
    let sql = `SELECT area FROM blofin.subject WHERE `;
    if (subject) {
        args.push(subject);
        sql += `subject = ?`;
    }
    else if (area) {
        args.push(area);
        sql += `area = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.subject;
}
//+--------------------------------------------------------------------------------------+
//| Fetches subject area by key/area; returns all when requesting an empty prop set {};  |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { subject, area } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.subject`;
    if (subject) {
        args.push(subject);
        sql += ` WHERE subject = ?`;
    }
    else if (area) {
        args.push(area);
        sql += ` WHERE area = ?`;
    }
    return (0, query_utils_1.Select)(sql, args);
}
