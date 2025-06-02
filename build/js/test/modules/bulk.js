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
const query_utils_1 = require("../../db/query.utils");
const std_util_1 = require("../../lib/std.util");
const ContractType = __importStar(require("../../db/interfaces/contract_type"));
const InstrumentType = __importStar(require("../../db/interfaces/instrument_type"));
const InstrumentDetail = __importStar(require("../../db/interfaces/instrument_detail"));
async function PublishCurrency(Symbol, Suspense) {
    const key = (0, query_utils_1.UniqueKey)(6);
    const set = await (0, query_utils_1.Modify)(`INSERT INTO currency (currency, symbol, image_url, suspense) VALUES (UNHEX(?),?,'./public/images/currency/no-image.png',?) ON DUPLICATE KEY UPDATE suspense=?`, [key, Symbol, Suspense, Suspense]);
    const get = await (0, query_utils_1.Select)("SELECT currency FROM currency WHERE symbol = ?", [Symbol]);
    return get.length === 0 ? set.insertId : get[0].currency;
}
async function PublishInstrument(Base, Quote) {
    const key = (0, query_utils_1.UniqueKey)(6);
    const set = await (0, query_utils_1.Modify)(`INSERT IGNORE INTO instrument VALUES (UNHEX(?),?,?)`, [key, Base, Quote]);
    const get = await (0, query_utils_1.Select)("SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?", [Base, Quote]);
    /*@ts-ignore*/
    return get.length === 0 ? set.insertId : get[0].instrument;
}
function Publish(Instruments) {
    Instruments.forEach(async (item) => {
        const symbol = (0, std_util_1.splitSymbol)(item.instId);
        const base = await PublishCurrency(symbol[0], item.state !== "live");
        const quote = await PublishCurrency(symbol[1], false);
        const contract = await ContractType.Publish(item.contractType);
        const inst_type = await InstrumentType.Publish(item.instType);
        const inst = await PublishInstrument(base, quote);
        const detail = await InstrumentDetail.Publish(inst, inst_type, contract, item);
        console.log("Published", symbol);
    });
}
function ImportInstruments() {
    fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
        .then((response) => response.json())
        .then((result) => Publish(result.data));
}
ImportInstruments();
