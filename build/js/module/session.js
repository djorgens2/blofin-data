//+--------------------------------------------------------------------------------------+
//|                                                                           session.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
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
exports.signLogon = exports.signRequest = exports.setSession = exports.Session = void 0;
exports.openWebSocket = openWebSocket;
const std_util_1 = require("lib/std.util");
const crypto_util_1 = require("@lib/crypto.util");
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const Accounts = __importStar(require("@api/accounts"));
const Orders = __importStar(require("@db/interfaces/order"));
const session = {};
const Session = () => {
    return session;
};
exports.Session = Session;
const setSession = (props) => {
    // @ts-ignore
    //  Object.keys(props).forEach((key) => props[key] === undefined && delete props[key]);
    Object.assign(session, Object.assign(Object.assign({}, session), props));
};
exports.setSession = setSession;
//+--------------------------------------------------------------------------------------+
//| returns a fully rendered hmac encryption key specifically for Blofin requests;       |
//+--------------------------------------------------------------------------------------+
const signRequest = async (method, path, body) => {
    // console.log(method, path, props, Session());
    const { secret } = (0, exports.Session)();
    const timestamp = String(Date.now());
    const nonce = (0, crypto_util_1.uniqueKey)(32);
    const prehash = `${path}${method}${timestamp}${nonce}${body}`;
    const messageEncoded = new node_util_1.TextEncoder().encode(prehash);
    console.log("\n\nThe key:", secret, path, method, prehash, messageEncoded, timestamp);
    console.log("\n\nThe packages:", (0, exports.Session)());
    console.log("\n\nThe JSON:", body);
    const hmac = (0, node_crypto_1.createHmac)("sha256", secret).update(messageEncoded).digest("hex");
    const hexEncoded = Buffer.from(hmac).toString("hex");
    const sign = Buffer.from(hexEncoded, "hex").toString("base64");
    return { sign, timestamp, nonce };
};
exports.signRequest = signRequest;
//+--------------------------------------------------------------------------------------+
//| returns a fully rendered hmac encryption key specifically for Blofin;                |
//+--------------------------------------------------------------------------------------+
const signLogon = async (key) => {
    const timestamp = String(Date.now());
    const nonce = (0, crypto_util_1.uniqueKey)(32);
    const method = "GET";
    const path = "/users/self/verify";
    const prehash = `${path}${method}${timestamp}${nonce}`;
    const messageEncoded = new node_util_1.TextEncoder().encode(prehash);
    const hmac = (0, node_crypto_1.createHmac)("sha256", key).update(messageEncoded).digest("hex");
    const hexEncoded = Buffer.from(hmac).toString("hex");
    const sign = Buffer.from(hexEncoded, "hex").toString("base64");
    return { sign, timestamp, nonce };
};
exports.signLogon = signLogon;
//+--------------------------------------------------------------------------------------+
//| Opens the ws to Blofin and establishes com channels/listeners;                       |
//+--------------------------------------------------------------------------------------+
function openWebSocket(props) {
    const { account, api, secret, phrase, wss_url, rest_api_url, wss_public_url } = props;
    const ws = new WebSocket(wss_url);
    (0, exports.setSession)({ account, state: "connecting", api, secret, phrase, wss_url, rest_api_url, wss_public_url });
    ws.onopen = () => {
        const login = async () => {
            const { sign, timestamp, nonce } = await (0, exports.signLogon)(secret);
            ws.send(JSON.stringify({
                op: "login",
                args: [{ apiKey: api, passphrase: phrase, timestamp, sign, nonce }],
            }));
        };
        login();
    };
    ws.onclose = () => {
        (0, exports.setSession)({ state: "closed" });
        console.log("socket closed");
    };
    ws.onerror = (error) => {
        (0, exports.setSession)({ state: "error" });
        console.error("WebSocket error:", error);
    };
    ws.onmessage = (event) => {
        var _a, _b;
        const message = (0, std_util_1.parseJSON)(event.data);
        if (message.event === "pong") {
            (0, exports.setSession)({ state: "connected" });
        }
        else if (message.event === "login") {
            if (message.code === "0") {
                ws.send(JSON.stringify({
                    op: "subscribe",
                    args: [{ channel: "account" }, { channel: "positions" }, { channel: "orders" }],
                }));
                (0, exports.setSession)({ account, state: "connected", api, secret, phrase, wss_url, rest_api_url, wss_public_url });
            }
            else
                (0, exports.setSession)({ state: "error" });
        }
        else if (message.event === "subscribe") {
            console.log("Subscriptions:", message.arg);
        }
        else if ((_a = message.arg) === null || _a === void 0 ? void 0 : _a.channel) {
            console.log("message pre-process", (_b = message.arg) === null || _b === void 0 ? void 0 : _b.channel);
            message.arg.channel === "account" && Accounts.Update(Object.assign(Object.assign({}, message.data), { account: account }));
            // message!.arg.channel === "orders" && console.log("Orders:", message!.data, api, secret);
            // message!.arg.channel === "positions" && console.log("Positions:", message!.data);
        }
        else
            console.log("Unhandled message:", message, (0, exports.Session)());
    };
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
        }
        if (ws.readyState === WebSocket.CONNECTING)
            console.log("Websocket trying to connect...");
        Orders.Execute();
    }, 29000);
    return ws;
}
