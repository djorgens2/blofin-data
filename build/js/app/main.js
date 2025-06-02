//+--------------------------------------------------------------------------------------+
//|                                                                              main.ts |
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
exports.CMain = void 0;
const session_1 = require("@module/session");
const child_process_1 = require("child_process");
const app_util_1 = require("@lib/app.util");
const state_1 = require("@db/interfaces/state");
const InstrumentPeriods = __importStar(require("@db/interfaces/instrument_period"));
const Accounts = __importStar(require("@db/interfaces/account"));
//+--------------------------------------------------------------------------------------+
//| CMain - Master Processing Instantiator/Monitor Class for Enabled Instruments;        |
//+--------------------------------------------------------------------------------------+
class CMain {
    async setService(service) {
        const keys = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT) : [``];
        const props = keys.find(({ alias }) => alias === service);
        const account = await Accounts.Key(props);
        return account ? (0, session_1.openWebSocket)(Object.assign(Object.assign({}, props), { account })) : undefined;
    }
    //+------------------------------------------------------------------------------------+
    //| Start - Loads order class array, syncs bar history, processes orders               |
    //+------------------------------------------------------------------------------------+
    async Start(service) {
        const instruments = await InstrumentPeriods.Fetch({ trade_status: state_1.Status.Enabled });
        const wss = await this.setService(service);
        instruments.forEach((instrument, id) => {
            const ipc = (0, app_util_1.clear)({ state: "init", symbol: instrument.symbol, node: id });
            const app = (0, child_process_1.fork)("./app/process.ts", [JSON.stringify(ipc)]);
            app.on("message", (message) => {
                message.state === "init" && app.send(Object.assign(Object.assign({}, message), { state: "api" }));
                message.state === "api" && app.send(Object.assign(Object.assign({}, message), { state: "update" }));
                message.state === "update" && Object.assign(ipc, (0, app_util_1.clear)(Object.assign(Object.assign({}, message), { state: "ready" })));
            });
            app.on("exit", (code) => {
                console.log(`[main] Symbol: [${ipc.symbol}] exit; PID: [${process.pid}:${app.pid}] with code ${code}`);
            });
        });
        setInterval(() => {
            // console.log('ping');
            if (wss && wss.readyState === WebSocket.OPEN) {
                wss.send("ping");
            }
            // if (ipc.state === "ready") {
            //   Object.assign(ipc, { ...ipc, state: "api" });
            //   app.send(ipc);
            // }
        }, 29000);
    }
}
exports.CMain = CMain;
