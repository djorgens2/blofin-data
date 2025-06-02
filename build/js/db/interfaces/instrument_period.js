//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_period.ts |
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
exports.Fetch = Fetch;
const query_utils_1 = require("@db/query.utils");
const Instrument = __importStar(require("@db/interfaces/instrument"));
const Period = __importStar(require("@db/interfaces/period"));
const State = __importStar(require("@db/interfaces/state"));
//+--------------------------------------------------------------------------------------+
//| Adds new/missing instrument periods;                                                 |
//+--------------------------------------------------------------------------------------+
async function Publish() {
    const result = await (0, query_utils_1.Modify)(`INSERT INTO blofin.instrument_period (instrument, period)
       SELECT missing.instrument, missing.period
         FROM instrument_period ip
              RIGHT JOIN (
                SELECT i.instrument, p.period
                  FROM blofin.instrument i, blofin.period p ) missing
                    ON ip.instrument = missing.instrument
                   AND ip.period = missing.period
        WHERE ip.period IS NULL`, []);
    return result;
}
//+--------------------------------------------------------------------------------------+
//| Examine instrument period search methods in props; return keys in priority sequence; |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const params = {};
    const keys = [];
    const filters = [];
    let sql = `select * from blofin.vw_instrument_periods`;
    (props.symbol || props.base_currency || props.base_symbol || props.instrument) && (params.instrument = await Instrument.Key(props));
    (props.timeframe || props.period) && (params.period = await Period.Key(props));
    (props.trade_state || props.trade_status) && (params.trade_state = await State.Key({ state: props.trade_state, status: props.trade_status }));
    if (params.instrument) {
        filters.push(`instrument`);
        keys.push(params.instrument);
    }
    if (params.period) {
        filters.push(`period`);
        keys.push(params.period);
    }
    if (params.trade_state) {
        filters.push(`trade_state`);
        keys.push(params.trade_state);
    }
    if (props.active_collection) {
        filters.push(`active_collection`);
        keys.push(props.active_collection);
    }
    filters.forEach((filter, position) => {
        sql += (position ? ` AND ` : ` WHERE `) + filter + ` = ?`;
    });
    return (0, query_utils_1.Select)(sql, keys);
}
