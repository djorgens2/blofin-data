//+--------------------------------------------------------------------------------------+
//|                                                                          accounts.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";
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
exports.Update = Update;
const Accounts = __importStar(require("@db/interfaces/account"));
const Currency = __importStar(require("@db/interfaces/currency"));
//+--------------------------------------------------------------------------------------+
//| Retrieve blofin account data and details; apply updates to local db;                 |
//+--------------------------------------------------------------------------------------+
async function Update(props) {
    const [account] = await Accounts.Fetch({ account: props.account });
    if (account) {
        Accounts.Update({
            account: props.account,
            total_equity: parseFloat(props.totalEquity),
            isolated_equity: parseFloat(props.isolatedEquity),
            update_time: parseInt(props.ts),
        });
        for (let id in props.details) {
            const detail = props.details[id];
            const currency = await Currency.Key({ symbol: detail.currency });
            currency &&
                Accounts.UpdateDetail({
                    account: props.account,
                    currency,
                    balance: parseFloat(detail.balance),
                    equity: parseFloat(detail.equity),
                    isolated_equity: parseFloat(detail.isolatedEquity),
                    available: parseFloat(detail.available),
                    available_equity: parseFloat(detail.availableEquity),
                    equity_usd: parseFloat(detail.equityUsd),
                    frozen: parseFloat(detail.frozen),
                    order_frozen: parseFloat(detail.orderFrozen),
                    borrow_frozen: parseFloat(detail.borrowFrozen),
                    unrealized_pnl: parseFloat(detail.unrealizedPnl),
                    isolated_unrealized_pnl: parseFloat(detail.isolatedUnrealizedPnl),
                    coin_usd_price: parseFloat(detail.coinUsdPrice),
                    margin_ratio: parseFloat(detail.marginRatio),
                    spot_available: parseFloat(detail.spotAvailable),
                    liability: parseFloat(detail.liability),
                    update_time: parseInt(detail.ts),
                });
        }
    }
}
