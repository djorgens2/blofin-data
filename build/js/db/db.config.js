"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const pool = promise_1.default.createPool({
    host: 'localhost',
    user: 'blofin_user',
    password: 'blofin123',
    database: 'blofin',
    connectionLimit: 10,
    maxIdle: 10,
});
// port: process.env.DB_PORT,
// waitForConnections: process.env.DB_WAITFORCONNECTIONS,
// connectionLimit: process.env.DB_POOLLIMIT,
// queueLimit: process.env.DB_QUEUELIMIT,
exports.default = pool;
