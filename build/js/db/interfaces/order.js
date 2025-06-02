//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
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
exports.Request = Request;
exports.Execute = Execute;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
const std_util_1 = require("@lib/std.util");
const Refs = __importStar(require("@db/interfaces/reference"));
const OrderAPI = __importStar(require("@api/orders"));
//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
async function Request(props) {
    const key = (0, crypto_util_1.hexify)((0, crypto_util_1.hashKey)(6));
    const [{ order_state }] = await Refs.Fetch("order_state", { order_state: undefined, source_ref: "live" });
    const [{ order_type }] = await Refs.Fetch("order_type", { order_type: undefined, source_ref: props.order_type });
    const [fields, args] = (0, query_utils_1.parseColumns)(Object.assign(Object.assign({}, props), { client_order_id: key, order_state, order_type }), "");
    const sql = `INSERT INTO blofin.requests ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;
    await (0, query_utils_1.Modify)(sql, args);
    console.log(sql, args, props);
    return key;
}
//+--------------------------------------------------------------------------------------+
//| Formats and emits order requests to broker for execution;                            |
//+--------------------------------------------------------------------------------------+
async function Execute() {
    const requests = await Refs.Fetch("vw_api_requests", { orderState: "live" });
    for (let id in requests) {
        const request = requests[id];
        const custKey = (0, crypto_util_1.hexify)(request.clientOrderId);
        const api = {
            instId: request.instId,
            marginMode: request.marginMode,
            positionSide: request.positionSide,
            side: request.side,
            orderType: request.orderType,
            price: request.price,
            size: request.size,
            leverage: request.leverage,
            reduceOnly: request.reduceOnly,
            clientOrderId: (0, std_util_1.hexString)(custKey, 3),
            tpTriggerPrice: request.tpTriggerPrice ? request.tpTriggerPrice : undefined,
            tpOrderPrice: request.tpOrderPrice ? request.tpTriggerPrice : undefined,
            slTriggerPrice: request.slTriggerPrice ? request.tpTriggerPrice : undefined,
            slOrderPrice: request.slOrderPrice ? request.tpTriggerPrice : undefined,
            brokerId: request.brokerId ? request.brokerId : undefined,
        };
        await OrderAPI.Submit(api);
    }
    return requests.length;
}
