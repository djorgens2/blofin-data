"use server";

import { createHmac, createHash } from "node:crypto";
import { UniqueKey } from "@/db/query.utils";
import { TextEncoder } from "node:util";

import * as dotenv from "dotenv";
import * as path from "path";
import { hex } from "./std.util";

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

export interface IConfigProps {
  name: string;
  api: string;
  key: string;
  phrase: string;
}

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const apiKey = process.env.BF_APIKEY ? process.env.BF_APIKEY : ``;
const secret = process.env.BF_SECRET ? process.env.BF_SECRET : ``;
const passphrase = process.env.BF_PASSPHRASE ? process.env.BF_PASSPHRASE : ``;
const config: Array<IConfigProps> = process.env.APP_CONNECTIONS ? JSON.parse(process.env.APP_CONNECTIONS) : ``;

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

export const hashKey = (length: number = 32): Uint8Array => {
  if (length % 2 === 0) {
    const hashKey = new Uint8Array(length / 2);
    const key = UniqueKey(length).slice(2);

    for (let block = 0; block * 2 < length; block++) {
      hashKey.set([parseInt(key?.slice(block * 2, block * 2 + 2), 16)], block);
    }
    return hashKey;
  }
  return new Uint8Array(length / 2);
};

export const hashPassword = (props: { username: string; email: string; password: string; hash: Uint8Array }) => {
  const length = 64;
  const message = JSON.stringify(props);
  const key = createHash("sha256").update(message).digest("hex");
  const hashKey = new Uint8Array(length/2);

  for (let block = 0; block * 2 < length; block++) {
    hashKey.set([parseInt(key?.slice(block * 2, block * 2 + 2), 16)], block);
  }
  console.log(props.hash)
  return hashKey;
};
