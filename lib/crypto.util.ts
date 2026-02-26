/**
 * @file crypto.util.ts
 * @module CryptoUtils
 * @description 
 * Security and Data Normalization utilities. Handles HMAC signing for 
 * exchange authentication, NanoID generation for internal Primary Keys, 
 * and Hex-to-Uint8Array normalization for database-safe buffers.
 * 
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { ISession } from "#module/session";
import { createHmac, createHash } from "node:crypto";
import { customAlphabet } from "nanoid";
import { TextEncoder } from "node:util";
import * as User from "#db/interfaces/user";

/**
 * Generates a SHA-256 HMAC signature specifically formatted for the Blofin exchange.
 * 
 * @async
 * @function hashHmac
 * @param {Partial<ISession>} props - Object containing API key, Secret, and Passphrase.
 * @returns {Promise<string | undefined>} Base64 encoded HMAC signature or undefined if credentials missing.
 * @description
 * 1. Concatenates API + Secret + Passphrase.
 * 2. Encodes using native {@link TextEncoder}.
 * 3. Signs using SHA-256 and digests to hex.
 * 4. Normalizes and returns the final signature in Base64 format.
 */
export const hashHmac = async (props: Partial<ISession>) => {
  const { api, secret, phrase } = props;

  if (api && secret && phrase) {
    const key = api.concat(secret, phrase);
    const encoded = new TextEncoder().encode(key);
    const hmac = createHmac("sha256", secret).update(encoded).digest("hex");
    const hex = Buffer.from(hmac).toString("hex");
    return hex ? Buffer.from(hex, "hex").toString("base64") : undefined;
  }

  return undefined;
};

/**
 * Generates a cryptographically secure random hex string using NanoID.
 * Primarily used for generating Unique Primary Keys (PKs).
 * 
 * @function uniqueKey
 * @param {number} length - Desired length of the output hex string.
 * @returns {string} A random string composed of characters [0-9A-Fa-f].
 */
export const uniqueKey = (length: number): string => {
  const nanoid = customAlphabet("0123456789abcdef", length);
  return nanoid();
};

/**
 * Normalizes various inputs into a standardized Uint8Array (Buffer).
 * Essential for reconciling account IDs across the Mama/Papa process boundary.
 * 
 * @function hexify
 * @param {string | Uint8Array | number | object} key - The raw input to be converted.
 * @param {number} [size] - Optional padding size (in bytes).
 * @param {string} [prefix=""] - Optional prefix to prepend to the hex string.
 * @returns {Uint8Array | undefined} A Node.js Buffer instance or undefined if input is invalid.
 * @description
 * Handles:
 * - Native Uint8Arrays
 * - JSON-serialized Buffer objects (`{type: 'Buffer', data: []}`)
 * - Numeric values (converted to hex)
 * - Stringified hex (removes '0x' or '<Buffer' formatting)
 */
export const hexify = (key: string | Uint8Array | number | object, size?: number, prefix = ""): Uint8Array | undefined => {
  if (key) {
    // Handle existing Binary
    if (key instanceof Uint8Array)
      if (key.length > 0) return Buffer.from(key);
      else return undefined;

    // Handle serialized Buffer objects
    if (typeof key === "object" && "type" in key && key.type === "Buffer")
      if ("data" in key && Array.isArray(key.data)) return Buffer.from(key.data);
      else return undefined;

    // Handle Numbers (cast to hex)
    if (typeof key === "number") key = key.toString(16);

    // Handle Strings (cleanup and validation)
    if (typeof key === "string") {
      key.slice(0, 2) === "0x" && (key = key.slice(2));
      // Cleanup stringified Buffer tags e.g. <Buffer 24 59 7a>
      key.slice(0, 7) === "<Buffer" && (key = key.slice(8, -1).split(" ").join(""));

      const regex = /^[0-9A-Fa-f]+$/;
      size = (size ?? Math.ceil(key.length / 2)) * 2;

      if (regex.test(key)) {
        size && (key = prefix.concat(key.padStart(size, "0")));
        return Buffer.from(key, "hex");
      }
    }
  }

  return undefined;
};

/**
 * Creates a randomly generated unique key and returns it as a Uint8Array.
 * 
 * @function hashKey
 * @param {number} [length=32] - Length of the hex string to generate.
 * @returns {Uint8Array} Binary representation of the generated key.
 */
export const hashKey = (length: number = 32): Uint8Array => {
  const hashKey = new Uint8Array(length / 2);
  const key = uniqueKey(length);

  for (let byte = 0; byte * 2 < length; byte++) {
    hashKey.set([parseInt(key?.slice(byte * 2, byte * 2 + 2), 16)], byte);
  }
  return Buffer.from(hashKey);
};

/**
 * Generates a SHA-256 hash of a User object for identity validation or password hashing.
 * 
 * @function hashPassword
 * @param {Partial<User.IUser>} props - The User object or properties to be hashed.
 * @returns {Uint8Array} A 32-byte binary Buffer (derived from the 64-character hex hash).
 * 
 * @description
 * 1. Serializes the provided user properties into a JSON string.
 * 2. Computes a SHA-256 hash using the native Node.js `crypto` module.
 * 3. Iterates through the resulting 64-character hex string to convert it into a 
 *    byte-aligned {@link Uint8Array}.
 * 4. Returns a {@link Buffer} instance, making it compatible with database binary fields.
 * 
 * @example
 * const binaryHash = hashPassword({ email: "dennis@example.com", password: "..." });
 */
export const hashPassword = (props: Partial<User.IUser>): Uint8Array => {
  const length = 64; // SHA-256 produces a 64-character hex string
  const message = JSON.stringify(props);
  const key = createHash("sha256").update(message).digest("hex");
  const hashKey = new Uint8Array(length / 2);

  // Convert the hex string into a binary array byte by byte
  for (let byte = 0; byte * 2 < length; byte++) {
    hashKey.set([parseInt(key?.slice(byte * 2, byte * 2 + 2), 16)], byte);
  }
  
  return Buffer.from(hashKey);
};
