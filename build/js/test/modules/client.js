"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_util_1 = require("../../lib/crypto.util");
const std_util_1 = require("../../lib/std.util");
const ws = new WebSocket("wss://openapi.blofin.com/ws/private");
let state = "connecting";
ws.onopen = () => {
    console.log("Connected to server");
    const login = async () => {
        const [apiKey, passphrase, sign, timestamp, nonce] = await (0, crypto_util_1.signMessage)({ method: "GET", path: "/users/self/verify" });
        ws.send(JSON.stringify({
            op: "login",
            args: [{ apiKey, passphrase, timestamp, sign, nonce }],
        }));
    };
    login();
    // ws.send(
    //   JSON.stringify({
    //     op: "subscribe",
    //     args: [{ channel: "candle15m", instId: "XRP-USDT" }],
    //   })
    // );
};
ws.onmessage = (message) => {
    const msg = (0, std_util_1.parseJSON)(message.data);
    console.log("WS Message:", msg);
    if (msg.event === "login") {
        if (msg.code) {
            ws.send(JSON.stringify({
                op: "subscribe",
                args: [{ channel: "account" }],
            }));
            state = "connected";
        }
        else
            state = "error";
    }
    else {
        // switch (message!.arg!.channel) {
        //   case "account": {
    }
};
ws.onclose = () => {
    console.log("Disconnected from server");
};
ws.onerror = (error) => {
    console.error("WebSocket error:", error);
};
setInterval(() => {
    ws.send('ping');
}, 29000);
const data = {
    arg: { channel: "account" },
    data: {
        ts: "1746470353659",
        totalEquity: "4927.533672655394388412425936",
        isolatedEquity: "0",
        details: [
            {
                currency: "USDT",
                equity: "4928.203908386935011574",
                available: "4928.203908386935011574",
                balance: "4928.203908386935011574",
                ts: "1746154533175",
                isolatedEquity: "0",
                equityUsd: "4927.533672655394388412425936",
                availableEquity: "4928.203908386935011574",
                frozen: "0",
                orderFrozen: "0",
                unrealizedPnl: "0",
                isolatedUnrealizedPnl: "0",
                coinUsdPrice: "0.999864",
                marginRatio: "",
                spotAvailable: "",
                liability: "",
                borrowFrozen: "",
            },
        ],
    },
};
