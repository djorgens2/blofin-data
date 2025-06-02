//+--------------------------------------------------------------------------------------+
//|                                                                       instruments.ts |
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
exports.Merge = Merge;
exports.Import = Import;
const std_util_1 = require("@lib/std.util");
const app_util_1 = require("@lib/app.util");
const Instrument = __importStar(require("@db/interfaces/instrument"));
const Currency = __importStar(require("@db/interfaces/currency"));
const ContractType = __importStar(require("@db/interfaces/contract_type"));
const InstrumentType = __importStar(require("@db/interfaces/instrument_type"));
const InstrumentDetail = __importStar(require("@db/interfaces/instrument_detail"));
const InstrumentPeriod = __importStar(require("@db/interfaces/instrument_period"));
//+--------------------------------------------------------------------------------------+
//| Publish - Creates new instruments; populates periods on new Blofin receipts          |
//+--------------------------------------------------------------------------------------+
async function Publish(apiInstrument) {
    for (const api of apiInstrument) {
        const symbol = (0, app_util_1.splitSymbol)(api.instId);
        const base_currency = await Currency.Publish(symbol[0], api.state !== "live");
        const quote_currency = await Currency.Publish(symbol[1], false);
        const contract_type = await ContractType.Publish(api.contractType);
        const instrument_type = await InstrumentType.Publish(api.instType);
        const instrument = await Instrument.Publish(base_currency, quote_currency);
        await InstrumentDetail.Publish(instrument, instrument_type, contract_type, api);
    }
    return apiInstrument;
}
//+--------------------------------------------------------------------------------------+
//| Merge Instruments/details stored locally w/Blofin json; applies diffs                |
//+--------------------------------------------------------------------------------------+
async function Merge(apiInstruments) {
    const instruments = await Instrument.Fetch({});
    const modified = [];
    const suspense = [];
    const db = instruments.sort((a, b) => {
        return a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0;
    });
    const api = apiInstruments.sort((a, b) => {
        return a.instId < b.instId ? -1 : a.instId > b.instId ? 1 : 0;
    });
    if (db.length >= api.length) {
        let instrument = 0;
        db.forEach((local) => {
            if (local.symbol === api[instrument].instId) {
                let updated = false;
                !(0, std_util_1.isEqual)(local.contract_value, api[instrument].contractValue) && (updated = true);
                !(0, std_util_1.isEqual)(local.list_timestamp, parseInt(api[instrument].listTime) / 1000, 0) && (updated = true);
                !(0, std_util_1.isEqual)(local.expiry_timestamp, parseInt(api[instrument].expireTime) / 1000, 0) && (updated = true);
                !(0, std_util_1.isEqual)(local.max_leverage, api[instrument].maxLeverage) && (updated = true);
                !(0, std_util_1.isEqual)(local.min_size, api[instrument].minSize) && (updated = true);
                !(0, std_util_1.isEqual)(local.lot_size, api[instrument].lotSize) && (updated = true);
                !(0, std_util_1.isEqual)(local.tick_size, api[instrument].tickSize) && (updated = true);
                !(0, std_util_1.isEqual)(local.max_limit_size, api[instrument].maxLimitSize) && (updated = true);
                !(0, std_util_1.isEqual)(local.max_market_size, api[instrument].maxMarketSize) && (updated = true);
                local.instrument_type !== api[instrument].instType && (updated = true);
                local.contract_type !== api[instrument].contractType && (updated = true);
                local.suspense === !!(api[instrument].state === "live") && (updated = true);
                if (updated) {
                    const update = Object.assign({}, { instrument: local.instrument }, api[instrument]);
                    modified.push(update);
                }
                instrument++;
            }
            else if (local.symbol <= api[instrument].instId) {
                !local.suspense && suspense.push({ currency: local.base_currency, symbol: local.base_symbol });
            }
        });
    }
    console.log("Instruments Suspended: ", suspense.length, suspense);
    console.log("Instruments Updated: ", modified.length, modified);
    await Currency.Suspend(suspense);
    await Instrument.Suspend(suspense);
    await InstrumentDetail.Update(modified);
    InstrumentPeriod.Publish();
}
//+--------------------------------------------------------------------------------------+
//| Import - Retrieve api Instrument, pass to publisher                                  |
//+--------------------------------------------------------------------------------------+
function Import() {
    fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
        .then((response) => response.json())
        .then(async (result) => await Publish(result.data))
        .then(async (data) => await Merge(data));
}
