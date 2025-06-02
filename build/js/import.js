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
const candles_1 = require("@api/candles");
const State = __importStar(require("@db/interfaces/state"));
const Period = __importStar(require("@db/interfaces/period"));
const Instruments = __importStar(require("@api/instruments"));
const Periods = __importStar(require("@db/interfaces/instrument_period"));
const app_util_1 = require("./lib/app.util");
State.Import();
Period.Import();
Instruments.Import();
//Brokers.Import();
//Roles.Import();
//-------------------------------- candles Import ---------------------------------------//
async function importCandles() {
    const instruments = await Periods.Fetch({ active_collection: true });
    console.log("Fetch filtered period:", instruments);
    instruments === null || instruments === void 0 ? void 0 : instruments.forEach((db, id) => {
        const ipc = (0, app_util_1.clear)({ state: "start", symbol: db.symbol, node: id });
        const props = {
            instrument: db.instrument,
            symbol: db.symbol,
            period: db.period,
            timeframe: db.timeframe,
        };
        (0, candles_1.Import)(ipc, Object.assign(Object.assign({}, props), { limit: db.bulk_collection_rate }));
    });
}
importCandles();
