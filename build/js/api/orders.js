//+--------------------------------------------------------------------------------------+
//|                                                                            orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Submit = Submit;
const session_1 = require("@module/session");
//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
async function Submit(props) {
    // @ts-ignore
    Object.keys(props).forEach((key) => props[key] === undefined && delete props[key]);
    const method = "POST";
    const path = "/api/v1/trade/order";
    const { api, phrase, rest_api_url } = (0, session_1.Session)();
    const body = JSON.stringify(props);
    const { sign, timestamp, nonce } = await (0, session_1.signRequest)(method, path, body);
    console.log(props);
    fetch(rest_api_url.concat(path), {
        method: "POST",
        headers: {
            "ACCESS-KEY": api,
            "ACCESS-SIGN": sign,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-NONCE": nonce,
            "ACCESS-PASSPHRASE": phrase,
            "Content-Type": "application/json",
        },
        body,
    })
        .then((response) => response.json())
        .then((json) => console.log(json))
        .catch((error) => console.log(error));
    // # Verify response format and success
    // if not isinstance(order_response, dict):
    //     raise Exception(f"Invalid order response format: {order_response}")
    // if "code" in order_response and order_response["code"] != "0":
    //     raise Exception(f"Order API error: {order_response}")
    // if "data" not in order_response:
    //     raise Exception(f"No data in order response: {order_response}")
    // order_id = order_response["data"][0]["orderId"]
    // print(f"Order placed: {order_id}")
}
