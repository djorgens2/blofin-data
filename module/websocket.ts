//+--------------------------------------------------------------------------------------+
//|                                                                         websocket.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import { parseJSON } from "lib/std.util";
import { uniqueKey } from "@lib/crypto.util";
import { createHmac } from "node:crypto";
import { TextEncoder } from "node:util";

import * as Accounts from "@api/accounts";
import { IKeyProps } from "@db/interfaces/account";

export type IResponseProps = {
  event: string;
  code: string;
  msg: string;
  action?: string;
  arg: {
    channel: string;
    instId: string;
  };
  data: any;
};

export const wsStatus = {
  connected: "connected",
  disconnected: "diconnected",
  connecting: "connecting",
  error: "error",
  closed: "closed",
} as const;
export type wsStatus = (typeof wsStatus)[keyof typeof wsStatus];

let state: wsStatus = "closed";

//+--------------------------------------------------------------------------------------+
//| returns a fully rendered hmac encryption key specifically for Blofin;                |
//+--------------------------------------------------------------------------------------+
export const signLogon = async (key: string) => {
  const timestamp = String(Date.now());
  const nonce = uniqueKey(32);
  const method = "GET";
  const path = "/users/self/verify";
  const prehash = `${path}${method}${timestamp}${nonce}`;
  const messageEncoded = new TextEncoder().encode(prehash);
  const hmac = createHmac("sha256", key).update(messageEncoded).digest("hex");
  const hexEncoded = Buffer.from(hmac).toString("hex");
  const sign = Buffer.from(hexEncoded, "hex").toString("base64");

  return [sign, timestamp, nonce];
};

//+--------------------------------------------------------------------------------------+
//| Opens the ws to Blofin and establishes com channels/listeners;                       |
//+--------------------------------------------------------------------------------------+
export function openWebSocket(props: Partial<IKeyProps>) {
  const { account, api, key, phrase, wss_url } = props;
  const ws = new WebSocket(wss_url!);

  ws.onopen = () => {
    const login = async () => {
      const [sign, timestamp, nonce] = await signLogon(key!);
      ws.send(
        JSON.stringify({
          op: "login",
          args: [{ apiKey: api, passphrase: phrase, timestamp, sign, nonce }],
        })
      );
    };

    login();
  };

  ws.onclose = () => {
    state = "closed";
    console.log("socket closed");
  };

  ws.onerror = (error) => {
    state = "error";
    console.error("WebSocket error:", error);
  };

  ws.onmessage = (event) => {
    const message = parseJSON<IResponseProps>(event.data);

    if (message!.event === "pong") {
      state = "connected";
    } else if (message!.event === "login") {
      if (message!.code === "0") {
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [{ channel: "account" }, { channel: "positions" }, { channel: "orders" }],
          })
        );
        state = "connected";
      } else state = "error";
    } else if (message!.event === "subscribe") {
      console.log("Subscriptions:", message!.arg);
    } else if (message!.arg?.channel) {
      message!.arg.channel === "account" && Accounts.Update({ ...message!.data, account: account! });
      message!.arg.channel === "orders" && console.log("Orders:", message!.data);
      message!.arg.channel === "positions" && console.log("Positions:", message!.data);
    } else console.log("Unhandled message:", message!.arg!);
  };

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 29000);
  return ws;
}
