//+---------------------------------------------------------------------------------------+
//|                                                                        crypto.util.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { ISession } from "module/session";

import { createHmac, createHash } from "node:crypto";
import { customAlphabet } from "nanoid";
import { TextEncoder } from "node:util";

import * as dotenv from "dotenv";
import * as path from "path";
import * as User from "db/interfaces/user";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const secret = process.env.USER_SECRET ? process.env.USER_SECRET : ``;

//+--------------------------------------------------------------------------------------+
//| returns a fully rendered hmac encryption key specifically for Blofin;                |
//+--------------------------------------------------------------------------------------+
export const hashHmac = async (props: Partial<ISession>) => {
  const { api, secret, phrase } = props;

  if (api && secret && phrase) {
    const key = api.concat(secret, phrase);
    const encoded = new TextEncoder().encode(key);
    const hmac = createHmac("sha256", secret).update(encoded).digest("hex");
    const hex = Buffer.from(hmac).toString("hex");
    return hex ? Buffer.from(hex, "hex").toString("base64") : undefined;
  };
  
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| returns a randomly generated (nanoid) hex 'unique' string; generally used for PKs    |
//+--------------------------------------------------------------------------------------+
export const uniqueKey = (length: number): string => {
  const nanoid = customAlphabet("0123456789abcdef", length);
  return nanoid();
};

//+--------------------------------------------------------------------------------------+
//| Returns a UIntArray on a valid hex value passed as a string|number; validates binary |
//+--------------------------------------------------------------------------------------+
export const hexify = (key: string | Uint8Array | number | object, size?: number, prefix = ""): Uint8Array | undefined => {
  if (key) {
    if (key instanceof Uint8Array)
      if (key.length > 0) return Buffer.from(key);
      else return undefined;

    if (typeof key === "object" && "type" in key && key.type === "Buffer")
      if ("data" in key && Array.isArray(key.data)) return Buffer.from(key.data);
      else return undefined;
  }

  if (typeof key === "number") key = key.toString(16);

  if (typeof key === "string") {
    key.slice(0, 2) === "0x" && (key = key.slice(2));
    key.slice(0, 7) === "<Buffer" && (key = key.slice(8, 15).split(" ").join(""));

    const regex = /^[0-9A-Fa-f]+$/;
    const bytes = new Uint8Array(key.length / 2);

    if (regex.test(key)) {
      size && (key = prefix.concat(key.padStart(size * 2, "0")));
      return Buffer.from(key, "hex");
    }
  }

  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Creates randomly generated uniqueKey (nanoid); returns in binary;                    |
//+--------------------------------------------------------------------------------------+
export const hashKey = (length: number = 32): Uint8Array => {
  const hashKey = new Uint8Array(length / 2);
  const key = uniqueKey(length);

  for (let byte = 0; byte * 2 < length; byte++) {
    hashKey.set([parseInt(key?.slice(byte * 2, byte * 2 + 2), 16)], byte);
  }
  return Buffer.from(hashKey);
};

//+--------------------------------------------------------------------------------------+
//| Given user properties identify the user, validates against a local hash;             |
//+--------------------------------------------------------------------------------------+
export const hashPassword = (props: Partial<User.IUser>) => {
  const length = 64;
  const message = JSON.stringify(props);
  const key = createHash("sha256").update(message).digest("hex");
  const hashKey = new Uint8Array(length / 2);

  for (let byte = 0; byte * 2 < length; byte++) {
    hashKey.set([parseInt(key?.slice(byte * 2, byte * 2 + 2), 16)], byte);
  }
  return Buffer.from(hashKey);
};
