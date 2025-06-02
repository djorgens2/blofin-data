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
exports.CProcess = void 0;
const fractal_1 = require("@module/fractal");
const std_util_1 = require("@lib/std.util");
const Candles = __importStar(require("@api/candles"));
const Instrument = __importStar(require("@db/interfaces/instrument"));
//+--------------------------------------------------------------------------------------+
//| CProcess - Master Processing Instantiator/Monitor Class for Enabled Instruments;     |
//+--------------------------------------------------------------------------------------+
const CProcess = async () => {
    const [cli_message] = process.argv.slice(2);
    const message = (0, std_util_1.parseJSON)(cli_message);
    const [instrument] = await Instrument.Fetch({ symbol: message.symbol });
    const props = {
        instrument: instrument.instrument,
        symbol: instrument.symbol,
        period: instrument.trade_period,
        timeframe: instrument.trade_timeframe,
    };
    const Fractal = await (0, fractal_1.CFractal)(message, instrument);
    process.on("message", (message) => {
        message.state === "init" && Candles.Import(message, Object.assign(Object.assign({}, props), { limit: instrument.bulk_collection_rate }));
        message.state === "api" && Candles.Import(message, Object.assign(Object.assign({}, props), { limit: instrument.interval_collection_rate }));
        message.state === "update" && Fractal.Update(message);
    });
    process.on("exit", (code) => {
        console.log(`[process]  Symbol: [${message.symbol}] exit; PID: ${process.pid} exited with code ${code}`);
    });
    process.send && process.send(message);
};
exports.CProcess = CProcess;
const thread = (0, exports.CProcess)();
