import mysql from "mysql2/promise";

const pool = mysql.createPool({
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

export default pool;
