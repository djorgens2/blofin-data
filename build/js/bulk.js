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
    connectionLimit: 30,
    maxIdle: 10,
});
function SplitSymbol(Symbol) {
    const symbol = Symbol.split('-');
    if (symbol.length === 1)
        symbol.push('USDT');
    return symbol;
}
;
async function PublishSymbol(Symbol, Suspense) {
    try {
        const [result] = await pool.execute(`SELECT * FROM currency WHERE symbol = '${Symbol}';`);
        if (result.length === 0) {
            const [insert] = await pool.execute(`INSERT INTO currency (symbol, image_url, suspense) VALUES ('${Symbol}','./public/images/no-image.png',${Suspense});`);
            return insert.insertId;
        }
        console.log(result[0].currrency);
        return result[0].currency;
        // // Insert parent data
        // const [parentResult] = await connection.promise().query(
        //   'INSERT INTO parent_table (column1, column2) VALUES ?', 
        //   [parentData.map(row => [row.column1, row.column2])]
        // );
        // // Get the last inserted ID for the parent
        // const lastInsertedParentId = parentResult.insertId;
    }
    catch (error) {
        console.log(error);
    }
    ;
    return -1;
}
;
function Publish(Instruments) {
    Instruments.forEach(async (instrument) => {
        const symbol = SplitSymbol(instrument.instId);
        if (instrument.baseCurrency === symbol[0] && instrument.quoteCurrency === symbol[1]) {
            const base = await PublishSymbol(instrument.baseCurrency, instrument.state !== 'live');
            const quote = await PublishSymbol(instrument.quoteCurrency, false);
            console.log(base);
            console.log(quote);
        }
    });
}
;
function ImportInstruments() {
    fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
        .then(response => response.json())
        .then((result) => Publish(result.data));
}
;
// async function LoadBlofin() {
//   const Instruments = ImportInstruments();
//   try {
//     await connection.promise().beginTransaction();
//     // Insert parent data
//     const [parentResult] = await connection.promise().query(
//       'INSERT INTO parent_table (column1, column2) VALUES ?', 
//       [parentData.map(row => [row.column1, row.column2])]
//     );
//     // Get the last inserted ID for the parent
//     const lastInsertedParentId = parentResult.insertId;
//     // Add the parent ID to the child data
//     childData.forEach(row => row.parent_id = lastInsertedParentId);
//     // Insert child data
//     await connection.promise().query(
//       'INSERT INTO child_table (parent_id, column3, column4) VALUES ?', 
//       [childData.map(row => [row.parent_id, row.column3, row.column4])]
//     );
//     await connection.promise().commit();
//     console.log('Bulk insert successful.');
//   } catch (error) {
//     await connection.promise().rollback();
//     console.error('Error during bulk insert:', error);
//   }
// }
ImportInstruments();
