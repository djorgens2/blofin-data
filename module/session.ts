//+--------------------------------------------------------------------------------------+
//|                                                                           session.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import { parseJSON } from "lib/std.util";
import { uniqueKey } from "@lib/crypto.util";
import { createHmac } from "node:crypto";
import { TextEncoder } from "node:util";

import * as PositionsAPI from "@api/positions";
import * as AccountAPI from "@api/accounts";
import * as RequestAPI from "@api/requests"
import * as OrderAPI from "@api/orders";
import * as StopsAPI from "@api/stops";
import * as Execute from "@module/trades"

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

export type TState = "disconnected" | "connected" | "connecting" | "error" | "closed";
export type TSession = {
  account: Uint8Array;
  alias: string;
  state: TState;
  api: string;
  secret: string;
  phrase: string;
  wss_url: string;
  rest_api_url: string;
  wss_public_url: string;
};

const session: Partial<TSession> = {};

export const Session = () => {
  return session;
};
export const setSession = (props: Partial<TSession>) => Object.assign(session, { ...session, ...props });

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
export function openWebSocket(props: Partial<TSession>) {
  const { account, api, secret, phrase, wss_url, rest_api_url, wss_public_url } = props;
  const ws = new WebSocket(wss_url!);

  setSession({ account, state: "connecting", api, secret, phrase, wss_url, rest_api_url, wss_public_url });

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
      console.log(new Date().toLocaleTimeString());
      await PositionsAPI.Import();
      await OrderAPI.Import();
      await StopsAPI.Import();
      await Execute.Trades();

    } else if (message!.event === "login") {
      if (message!.code === "0") {
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [{ channel: "account" }, { channel: "positions" }, { channel: "orders" }],
          })
        );
        setSession({ account, state: "connected", api, secret, phrase, wss_url, rest_api_url, wss_public_url });
      } else setSession({ state: "error" });
    } else if (message!.event === "subscribe") {
      console.log("Subscriptions:", message!.arg);
    } else if (message!.arg?.channel) {
      message!.arg.channel === "account" && AccountAPI.Publish({ ...message!.data, account: account });
      message!.arg.channel === "orders" && OrderAPI.Publish(message!.data);
      message!.arg.channel === "positions" && PositionsAPI.Publish(message!.data);
    } else console.log("Unhandled message:", message!, Session());
  };

  return ws;
}
