//+--------------------------------------------------------------------------------------+
//|                                                                          currency.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Publish = Publish;
exports.Key = Key;
exports.Suspend = Suspend;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
//+--------------------------------------------------------------------------------------+
//| Adds all new currencies recieved from Blofin to the database; defaults image         |
//+--------------------------------------------------------------------------------------+
async function Publish(symbol, suspense) {
    const currency = await Key({ symbol });
    if (currency === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        const defaultImage = "./public/images/currency/no-image.png";
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.currency (currency, symbol, image_url, suspense) VALUES (?, ?, ?, ?)`, [key, symbol, defaultImage, suspense]);
        return key;
    }
    return currency;
}
//+--------------------------------------------------------------------------------------+
//| Examines currency search methods in props; executes first in priority sequence;      |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { currency, symbol } = props;
    const args = [];
    let sql = `SELECT currency FROM blofin.currency WHERE `;
    if (currency) {
        args.push(currency);
        sql += `currency = ?`;
    }
    else if (symbol) {
        args.push(symbol);
        sql += `symbol = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.currency;
}
//+--------------------------------------------------------------------------------------+
//| Suspends provided currency upon receipt of an 'unalive' state from Blofin;           |
//+--------------------------------------------------------------------------------------+
async function Suspend(suspensions) {
    for (const props of suspensions) {
        const { currency, symbol } = props;
        const args = [];
        let sql = `UPDATE blofin.currency SET suspense = true WHERE `;
        if (currency) {
            args.push(currency);
            sql += `currency = ?`;
        }
        else if (symbol) {
            args.push(symbol);
            sql += `symbol = ?`;
        }
        else
            return;
        await (0, query_utils_1.Modify)(sql, args);
    }
}
