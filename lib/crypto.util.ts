"use server";

import { createHmac } from "node:crypto";
import { UniqueKey } from "@/db/query.utils";
import { TextEncoder } from "node:util";

import * as dotenv from "dotenv";
import * as path from "path";

export interface IResponseProps {
  event: string;
  code: string;
  arg: {
    channel: string;
    instId: string;
  };
  data: Array<string>;
}
export interface IKeyProps {
  method: string;
  path: string;
  body?: string;
}

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const apiKey = process.env.BF_APIKEY ? process.env.BF_APIKEY : ``;
const secret = process.env.BF_SECRET ? process.env.BF_SECRET : ``;
const passphrase = process.env.BF_PASSPHRASE ? process.env.BF_PASSPHRASE : ``;

export const signMessage = async (keys: IKeyProps) => {
  const { method, path, body } = keys;

  const timestamp = String(Date.now());
  const nonce = UniqueKey(32).substring(2);
  const message = body ? `${path}${method}${timestamp}${nonce}${body}` : `${path}${method}${timestamp}${nonce}`;
  const messageEncoded = new TextEncoder().encode(message);
  const hmac = createHmac("sha256", secret).update(messageEncoded).digest("hex");
  const hexEncoded = Buffer.from(hmac).toString("hex");
  const sign = Buffer.from(hexEncoded, "hex").toString("base64");

  console.log("server:", [message, messageEncoded, hmac, hexEncoded, sign]);
  return [apiKey, passphrase, sign, timestamp, nonce];
};
