//+--------------------------------------------------------------------------------------+
//|                                                                 instrument_detail.ts |
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
exports.Update = Update;
const query_utils_1 = require("@db/query.utils");
const Instrument = __importStar(require("@db/interfaces/instrument"));
const ContractType = __importStar(require("@db/interfaces/contract_type"));
const InstrumentType = __importStar(require("@db/interfaces/instrument_type"));
//+--------------------------------------------------------------------------------------+
//| Inserts Instrument Details on receipt of a new Instrument from Blofin; returns key;  |
//+--------------------------------------------------------------------------------------+
async function Publish(instrument, instrument_type, contract_type, api) {
    const key = await Instrument.Key({ instrument });
    const confirm = await Key({ instrument });
    if (key === undefined)
        return key;
    if (confirm === undefined) {
        const contractValue = parseFloat(api.contractValue);
        const maxLeverage = parseInt(api.maxLeverage);
        const minSize = parseFloat(api.minSize);
        const lotSize = parseFloat(api.lotSize);
        const tickSize = parseFloat(api.tickSize);
        const maxLimitSize = parseFloat(api.maxLimitSize);
        const maxMarketSize = parseFloat(api.maxMarketSize);
        const listTime = parseInt(api.listTime);
        const expireTime = parseInt(api.expireTime);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.instrument_detail 
          SET instrument = ?,
              instrument_type = ?,
              contract_type = ?,
              contract_value = ?,
              max_leverage = ?,
              min_size = ?,
              lot_size = ?,
              tick_size = ?,
              max_limit_size = ?,
              max_market_size = ?,
              list_time = FROM_UNIXTIME(?/1000),
              expiry_time = FROM_UNIXTIME(?/1000)`, [
            instrument,
            instrument_type,
            contract_type,
            contractValue,
            maxLeverage,
            minSize,
            lotSize,
            tickSize,
            maxLimitSize,
            maxMarketSize,
            listTime,
            expireTime,
        ]);
    }
    return key;
}
//+--------------------------------------------------------------------------------------+
//| Performs a lookup on instrument_detail; returns key if instrument detail exists      |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const args = [];
    let sql = `SELECT instrument FROM blofin.instrument_detail WHERE instrument = ?`;
    if (props.instrument) {
        args.push(props.instrument);
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.instrument;
}
//+--------------------------------------------------------------------------------------+
//| Updates instrument detail on all identified changes                                  |
//+--------------------------------------------------------------------------------------+
async function Update(updates) {
    for (const update of updates) {
        const instrument = update.instrument;
        const contract_type = await ContractType.Key({ source_ref: update.contractType });
        const instrument_type = await InstrumentType.Key({ source_ref: update.instType });
        const contractValue = parseFloat(update.contractValue);
        const maxLeverage = parseInt(update.maxLeverage);
        const minSize = parseFloat(update.minSize);
        const lotSize = parseFloat(update.lotSize);
        const tickSize = parseFloat(update.tickSize);
        const maxLimitSize = parseFloat(update.maxLimitSize);
        const maxMarketSize = parseFloat(update.maxMarketSize);
        const listTime = parseInt(update.listTime);
        const expireTime = parseInt(update.expireTime);
        if (update.instrument) {
            await (0, query_utils_1.Modify)(`UPDATE blofin.instrument_detail 
            SET instrument_type = ?,
                contract_type = ?,
                contract_value = ?,
                max_leverage = ?,
                min_size = ?,
                lot_size = ?,
                tick_size = ?,
                max_limit_size = ?,
                max_market_size = ?,
                list_time = FROM_UNIXTIME(?/1000),
                expiry_time = FROM_UNIXTIME(?/1000)
          WHERE instrument = ?`, [
                instrument_type,
                contract_type,
                contractValue,
                maxLeverage,
                minSize,
                lotSize,
                tickSize,
                maxLimitSize,
                maxMarketSize,
                listTime,
                expireTime,
                instrument,
            ]);
        }
    }
}
