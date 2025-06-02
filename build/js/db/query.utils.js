//+---------------------------------------------------------------------------------------+
//|                                                                        query.utils.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = Select;
exports.Modify = Modify;
exports.parseColumns = parseColumns;
const db_config_1 = __importDefault(require("@db/db.config"));
async function Select(query, fields) {
    const [results] = await db_config_1.default.execute(query, fields);
    return results;
}
async function Modify(query, fields) {
    const [results] = await db_config_1.default.execute(query, fields);
    return results;
}
function parseColumns(obj, suffix = ` = ?`) {
    const fields = [];
    const args = [];
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
            fields.push(`${key}${suffix}`);
            args.push(obj[key]);
        }
    }
    return [fields, args];
}
