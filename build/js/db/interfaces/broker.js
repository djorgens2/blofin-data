//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
exports.Add = Add;
exports.Key = Key;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
const Import = async () => await Add({ name: 'Blofin', image_url: './images/broker/no_image.png', website_url: 'https://blofin.com/' });
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds all new brokers recieved from ui or any internal source to the database;        |
//+--------------------------------------------------------------------------------------+
async function Add(props) {
    const { name, image_url, website_url } = props;
    const broker = await Key({ name });
    if (broker === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.broker VALUES (?, ?, ?, ?)`, [key, name, image_url, website_url]);
        return key;
    }
    return broker;
}
//+--------------------------------------------------------------------------------------+
//| Examines broker search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { broker, name } = props;
    const args = [];
    let sql = `SELECT broker FROM blofin.broker WHERE `;
    if (broker) {
        args.push(broker);
        sql += `broker = ?`;
    }
    else if (name) {
        args.push(name);
        sql += `name = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.broker;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { broker, name } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.broker`;
    if (broker) {
        args.push(broker);
        sql += ` WHERE broker = ?`;
    }
    else if (name) {
        args.push(name);
        sql += ` WHERE name = ?`;
    }
    return (0, query_utils_1.Select)(sql, args);
}
