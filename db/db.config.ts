//+------------------------------------------------------------------+
//|                                                     db.config.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import mysql from "mysql2/promise";

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SCHEMA || process.env.DB_DATABASE,
  connectionLimit: parseInt(process.env.DB_CONNECTIONLIMIT!),
  maxIdle: parseInt(process.env.DB_MAXIDLE!),
  connectTimeout: parseInt(process.env.DB_CONNECTTIMEOUT!),
});

// port: process.env.DB_PORT,
// waitForConnections: process.env.DB_WAITFORCONNECTIONS,
// connectionLimit: process.env.DB_POOLLIMIT,
// queueLimit: process.env.DB_QUEUELIMIT,

export default pool;
