//+--------------------------------------------------------------------------------------+
//|                                                                            candle.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Update = Update;
exports.Insert = Insert;
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
//+--------------------------------------------------------------------------------------+
//| Updates all differences between local db and candle provider                         |
//+--------------------------------------------------------------------------------------+
async function Update(modified) {
    for (const update of modified) {
        await (0, query_utils_1.Modify)(`UPDATE blofin.candle 
            SET open = ?,
                high = ?,
                low = ?,
                close = ?,
                volume = ?,
                vol_currency = ?,
                vol_currency_quote = ?,
                completed = ?
          WHERE instrument = ?
            AND period = ?
            AND bar_time = FROM_UNIXTIME(?/1000)`, [
            update.open,
            update.high,
            update.low,
            update.close,
            update.vol,
            update.volCurrency,
            update.volCurrencyQuote,
            update.confirm,
            update.instrument,
            update.period,
            update.ts,
        ]);
    }
}
//+--------------------------------------------------------------------------------------+
//| Inserts new candles retrieved from the blofin rest api;                              |
//+--------------------------------------------------------------------------------------+
async function Insert(missing) {
    for (const insert of missing) {
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.candle 
            SET instrument = ?,
                period = ?,
                bar_time = FROM_UNIXTIME(?/1000),
                open = ?,
                high = ?,
                low = ?,
                close = ?,
                volume = ?,
                vol_currency = ?,
                vol_currency_quote = ?,
                completed = ?`, [
            insert.instrument,
            insert.period,
            insert.ts,
            insert.open,
            insert.high,
            insert.low,
            insert.close,
            insert.vol,
            insert.volCurrency,
            insert.volCurrencyQuote,
            insert.confirm,
        ]);
    }
}
//+--------------------------------------------------------------------------------------+
//| Returns all candles meeting the mandatory instrument/period requirements;            |
//+--------------------------------------------------------------------------------------+
function Fetch(props) {
    const { instrument, period, timestamp, limit } = props;
    let sql = `SELECT timestamp, open, high, low, close, volume, vol_currency, vol_currency_quote, completed
   FROM blofin.vw_candles
   WHERE instrument = ?	AND period = ? and timestamp > ?
   ORDER BY	timestamp DESC`;
    sql += limit ? ` LIMIT ${limit || 1}` : ``;
    return (0, query_utils_1.Select)(sql, [instrument, period, timestamp || 0]);
}
