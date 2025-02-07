"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const pool = mysql2_1.default.createPool({
    host: 'localhost',
    user: 'blofin_user',
    password: 'blofin123',
    database: 'blofin',
    connectionLimit: 10,
    maxIdle: 10,
});
pool.execute('SELECT * FROM contract_type;', (err, results) => {
    if (err) {
        console.log('Error accessing Blofin DB contract_type', err);
        throw err;
    }
    const contract_types = results;
    contract_types.forEach(type => console.log(type.description));
    //@ts-ignore
    console.log(results[0].description);
    console.log(contract_types);
});
