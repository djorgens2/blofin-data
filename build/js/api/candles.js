//+--------------------------------------------------------------------------------------+
//|                                                                           candles.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
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
exports.Merge = Merge;
exports.Import = Import;
const std_util_1 = require("@lib/std.util");
const Candle = __importStar(require("@db/interfaces/candle"));
//+--------------------------------------------------------------------------------------+
//| Retrieves blofin rest api data and merges locally;                                   |
//+--------------------------------------------------------------------------------------+
async function Merge(message, props, apiCandles) {
    const candles = await Candle.Fetch(Object.assign(Object.assign({}, props), { limit: apiCandles.length }));
    const modified = [];
    const missing = [];
    const db = candles.sort((a, b) => {
        return a.timestamp < b.timestamp ? +1 : a.timestamp > b.timestamp ? -1 : 0;
    });
    const api = apiCandles.sort((a, b) => {
        return a.ts < b.ts ? +1 : a.ts > b.ts ? -1 : 0;
    });
    let candle = 0;
    api.forEach((remote) => {
        if (remote.ts / 1000 === db[candle].timestamp) {
            let updated = false;
            !(0, std_util_1.isEqual)(remote.open, db[candle].open) && (updated = true);
            !(0, std_util_1.isEqual)(remote.high, db[candle].high) && (updated = true);
            !(0, std_util_1.isEqual)(remote.low, db[candle].low) && (updated = true);
            !(0, std_util_1.isEqual)(remote.close, db[candle].close) && (updated = true);
            !(0, std_util_1.isEqual)(remote.vol, db[candle].volume) && (updated = true);
            !(0, std_util_1.isEqual)(remote.volCurrency, db[candle].vol_currency) && (updated = true);
            !(0, std_util_1.isEqual)(remote.volCurrencyQuote, db[candle].vol_currency_quote) && (updated = true);
            remote.confirm !== !!db[candle].completed && (updated = true);
            if (updated) {
                const update = Object.assign({}, props, remote);
                modified.push(update);
            }
            candle++;
        }
        else if (remote.ts / 1000 > db[candle].timestamp) {
            const insert = Object.assign({}, props, remote);
            missing.push(insert);
        }
    });
    await Candle.Update(modified);
    await Candle.Insert(missing);
    process.send && process.send(Object.assign(Object.assign({}, message), { db: { insert: missing.length, update: modified.length } }));
}
//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
async function Import(message, props) {
    fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${props.symbol}&limit=${props.limit}&bar=${props.timeframe}`)
        .then((response) => response.json())
        .then((result) => {
        const apiCandles = result.data.map((field) => ({
            ts: parseInt(field[0]),
            open: parseFloat(field[1]),
            high: parseFloat(field[2]),
            low: parseFloat(field[3]),
            close: parseFloat(field[4]),
            vol: parseInt(field[5]),
            volCurrency: parseInt(field[6]),
            volCurrencyQuote: parseInt(field[7]),
            confirm: parseInt(field[8]) === 1,
        }));
        Merge(message, props, apiCandles);
    });
}
