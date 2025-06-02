//+--------------------------------------------------------------------------------------+
//|                                                                     contract_type.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Publish = Publish;
exports.Key = Key;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
//+--------------------------------------------------------------------------------------+
//| Adds all new contract types recieved from Blofin to the database;                    |
//+--------------------------------------------------------------------------------------+
async function Publish(source_ref) {
    const contractType = await Key({ source_ref });
    if (contractType === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.contract_type VALUES (?, ?, 'Description Pending')`, [key, source_ref]);
        return key;
    }
    return contractType;
}
//+--------------------------------------------------------------------------------------+
//| Examines contract type search methods in props; executes first in priority sequence; |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { contract_type, source_ref } = props;
    const args = [];
    let sql = `SELECT contract_type FROM blofin.contract_type WHERE `;
    if (contract_type) {
        args.push(contract_type);
        sql += `contract_type = ?`;
    }
    else if (source_ref) {
        args.push(source_ref);
        sql += `source_ref = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.contract_type;
}
