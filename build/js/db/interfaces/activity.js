//+---------------------------------------------------------------------------------------+
//|                                                                           activity.ts |
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
exports.Publish = Publish;
exports.Key = Key;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
const Subject = __importStar(require("@db/interfaces/subject"));
//+--------------------------------------------------------------------------------------+
//| Imports seed task data to define user access privileges;                             |
//+--------------------------------------------------------------------------------------+
const Import = () => {
    Publish("Users", "User");
    Publish("Accounts", "Account");
    Publish("Jobs", "Account");
};
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds new Tasks to local database;                                                    |
//+--------------------------------------------------------------------------------------+
async function Publish(task, area) {
    const activity = await Key({ task });
    if (activity === undefined) {
        const [{ subject }] = await Subject.Fetch({ area });
        const key = (0, crypto_util_1.hashKey)(6);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.activity VALUES (?, ?, ?)`, [key, task, subject]);
        return key;
    }
    return activity;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { activity, task } = props;
    const args = [];
    let sql = `SELECT task FROM blofin.activity WHERE `;
    if (activity) {
        args.push(activity);
        sql += `activity = ?`;
    }
    else if (task) {
        args.push(task);
        sql += `task = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.activity;
}
//+--------------------------------------------------------------------------------------+
//| Fetches activities/tasks by key/task; returns all when requesting an empty set {};   |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { activity, task } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.activity`;
    if (activity) {
        args.push(activity);
        sql += ` WHERE activity = ?`;
    }
    else if (task) {
        args.push(task);
        sql += ` WHERE task = ?`;
    }
    return (0, query_utils_1.Select)(sql, args);
}
