//+--------------------------------------------------------------------------------------+
//|                                                                        instrument.ts |
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
exports.Publish = Publish;
exports.Key = Key;
exports.Fetch = Fetch;
exports.Suspend = Suspend;
const state_1 = require("@db/interfaces/state");
const query_utils_1 = require("@db/query.utils");
const app_util_1 = require("@lib/app.util");
const Currency = __importStar(require("@db/interfaces/currency"));
const State = __importStar(require("@db/interfaces/state"));
const crypto_util_1 = require("@lib/crypto.util");
//+--------------------------------------------------------------------------------------+
//| Determines if instrument exists, if not, writes new to database; returns Key         |
//+--------------------------------------------------------------------------------------+
async function Publish(base_currency, quote_currency) {
    const instrument = await Key({ base_currency, quote_currency });
    if (instrument === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        const state = await State.Key({ status: state_1.Status.Disabled });
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.instrument (instrument, base_currency, quote_currency, trade_state) VALUES (?, ?, ?, ?)`, [
            key,
            base_currency,
            quote_currency,
            state,
        ]);
        return key;
    }
    return instrument;
}
//+--------------------------------------------------------------------------------------+
//| Returns instrument by search method in props; executes search in priority sequence;  |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const keys = [];
    const filters = [];
    let sql = `SELECT instrument FROM blofin.vw_instruments`;
    if (props.instrument) {
        keys.push(props.instrument);
        filters.push(`instrument`);
    }
    else if (props.base_currency || props.quote_currency) {
        if (props.base_currency) {
            keys.push(props.base_currency);
            filters.push(`base_currency`);
        }
        if (props.quote_currency) {
            keys.push(props.quote_currency);
            filters.push(`quote_currency`);
        }
    }
    else if (props.base_symbol || props.quote_symbol) {
        if (props.base_symbol) {
            keys.push(props.base_symbol);
            filters.push(`base_symbol`);
        }
        if (props.quote_symbol) {
            keys.push(props.quote_symbol);
            filters.push(`quote_symbol`);
        }
    }
    else if (props.symbol) {
        const symbol = (0, app_util_1.splitSymbol)(props.symbol);
        keys.push(symbol[0], symbol[1]);
        filters.push(`base_symbol`, `quote_symbol`);
    }
    else
        return undefined;
    filters.forEach((filter, position) => {
        sql += (position ? ` AND ` : ` WHERE `) + filter + ` = ?`;
    });
    sql += ` LIMIT 1`;
    const [key] = await (0, query_utils_1.Select)(sql, keys);
    return key === undefined ? undefined : key.instrument;
}
//+--------------------------------------------------------------------------------------+
//| Retrieves all trading-related instrument details by Key;                             |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const instrument = await Key(props);
    const args = [];
    const sql = `SELECT * FROM blofin.vw_instruments` +
        (instrument ? ` WHERE instrument = ?` : ``) +
        (props.fromSymbol ? (instrument ? ` AND ` : ` WHERE `) : ``) +
        (props.fromSymbol ? `symbol >= ? ORDER BY symbol LIMIT ${props.limit || 1}` : ``);
    instrument && args.push(instrument);
    props.fromSymbol && args.push(props.fromSymbol);
    return (0, query_utils_1.Select)(sql, args);
}
//+--------------------------------------------------------------------------------------+
//| Suspends provided currency(s) upon receipt of an 'unalive' state from Blofin;        |
//+--------------------------------------------------------------------------------------+
async function Suspend(suspensions) {
    const state = await State.Key({ status: state_1.Status.Suspended });
    for (const suspense of suspensions) {
        const args = [state];
        if (suspense.currency) {
            args.push(suspense.currency);
        }
        else if (suspense.symbol) {
            const currency = await Currency.Key({ symbol: suspense.symbol });
            args.push(currency);
        }
        else
            return;
        await (0, query_utils_1.Modify)(`UPDATE blofin.instrument SET trade_state = ? WHERE base_currency = ?`, args);
    }
}
