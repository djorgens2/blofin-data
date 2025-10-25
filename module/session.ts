//+--------------------------------------------------------------------------------------+
//|                                                                           session.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { parseJSON } from "lib/std.util";
import { uniqueKey } from "lib/crypto.util";
import { createHmac } from "node:crypto";
import { TextEncoder } from "node:util";

import * as PositionsAPI from "api/positions";
import * as AccountAPI from "api/accounts";
import * as OrderAPI from "api/orders";
import * as Execute from "module/trades";

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

export interface ISession {
  account: Uint8Array;
  alias: string;
  state: "disconnected" | "connected" | "connecting" | "error" | "closed";
  audit_order: string;
  audit_stops: string;
  api: string;
  secret: string;
  phrase: string;
  rest_api_url: string;
  private_wss_url: string;
  public_wss_url: string;
}

const session: Partial<ISession> = {};

export const Session = () => {
  return session;
};
export const setSession = (props: Partial<ISession>) => Object.assign(session, { ...session, ...props });

//+--------------------------------------------------------------------------------------+
//| returns a fully rendered hmac encryption key specifically for Blofin requests;       |
//+--------------------------------------------------------------------------------------+
export const signRequest = async (method: string, path: string, body: string = "") => {
  const { secret } = Session();
  const timestamp = String(Date.now());
  const nonce = uniqueKey(32);
  const prehash = `${path}${method}${timestamp}${nonce}${body}`;
  const messageEncoded = new TextEncoder().encode(prehash);
  const hmac = createHmac("sha256", secret!).update(messageEncoded).digest("hex");
  const hexEncoded = Buffer.from(hmac).toString("hex");
  const sign = Buffer.from(hexEncoded, "hex").toString("base64");

  return { sign, timestamp, nonce };
};

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

  return { sign, timestamp, nonce };
};

//+--------------------------------------------------------------------------------------+
//| Opens the ws to Blofin and establishes com channels/listeners;                       |
//+--------------------------------------------------------------------------------------+
export const openWebSocket = (props: Partial<ISession>) => {
  const { account, api, secret, phrase, rest_api_url, private_wss_url, public_wss_url } = props;
  const ws = new WebSocket(private_wss_url!);

  setSession({ account, state: "connecting", audit_order: "0", audit_stops: "0", api, secret, phrase, rest_api_url, private_wss_url, public_wss_url });

  ws.onopen = () => {
    const login = async () => {
      const { sign, timestamp, nonce } = await signLogon(secret!);
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
    setSession({ state: "closed" });
    console.log("socket closed");
  };

  ws.onerror = (error) => {
    setSession({ state: "error" });
    console.error("WebSocket error:", error);
  };

  ws.onmessage = async (event) => {
    const message = parseJSON<IResponseProps>(event.data);

    if (message!.event === "pong") {
      setSession({ state: "connected" });
      await Execute.Trades();
    } else if (message!.event === "login") {
      if (message!.code === "0") {
        console.log(`Connected to websocket: [${process.pid}` + `:${ws.url}]`);
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [{ channel: "account" }, { channel: "positions" }, { channel: "orders" }],
          })
        );
        setSession({ account, state: "connected", api, secret, phrase, rest_api_url, private_wss_url, public_wss_url });
      } else setSession({ state: "error" });
    } else if (message!.event === "subscribe") {
      console.log("Subscriptions:", message!.arg);
    } else if (message!.arg?.channel) {
      message!.arg.channel === "account" && AccountAPI.Publish(message!.data);
      message!.arg.channel === "orders" && OrderAPI.Publish("WSS", message!.data);
      message!.arg.channel === "positions" && PositionsAPI.Publish(message!.data);
    } else console.log("Unhandled message:", message!, Session());
  };

  return ws;
}
