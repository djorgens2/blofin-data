//+---------------------------------------------------------------------------------------+
//|                                                                        crypto.util.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";
"use server";
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
exports.hashPassword = exports.hashKey = exports.hexify = exports.uniqueKey = exports.hashHmac = void 0;
const node_crypto_1 = require("node:crypto");
const nanoid_1 = require("nanoid");
const node_util_1 = require("node:util");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
const secret = process.env.USER_SECRET ? process.env.USER_SECRET : ``;
//+--------------------------------------------------------------------------------------+
//| returns a fully rendered hmac encryption key specifically for Blofin;                |
//+--------------------------------------------------------------------------------------+
const hashHmac = async (keys) => {
    const key = keys.join('');
    const encoded = new node_util_1.TextEncoder().encode(key);
    const hmac = (0, node_crypto_1.createHmac)("sha256", secret).update(encoded).digest("hex");
    const hex = Buffer.from(hmac).toString("hex");
    return Buffer.from(hex, "hex").toString("base64");
};
exports.hashHmac = hashHmac;
//+--------------------------------------------------------------------------------------+
//| returns a randomly generated (nanoid) hex 'unique' string; generally used for PKs    |
//+--------------------------------------------------------------------------------------+
const uniqueKey = (length) => {
    const nanoid = (0, nanoid_1.customAlphabet)("0123456789abcdef", length);
    return nanoid();
};
exports.uniqueKey = uniqueKey;
//+--------------------------------------------------------------------------------------+
//| Returns a UIntArray on a valid hex value passed as a string|number; validates binary |
//+--------------------------------------------------------------------------------------+
const hexify = (key) => {
    if (key) {
        if (key instanceof Uint8Array)
            if (key.length > 0)
                return Buffer.from(key);
            else
                return undefined;
        if (typeof key === "object" && "type" in key && key.type === "Buffer")
            if ("data" in key && Array.isArray(key.data))
                return Buffer.from(key.data);
            else
                return undefined;
    }
    if (typeof key === "string") {
        key.slice(0, 2) === "0x" && (key = key.slice(2));
        key.slice(0, 7) === "<Buffer" && (key = key.slice(8, 15).split(" ").join(""));
        const regex = /^[0-9A-Fa-f]+$/;
        const bytes = new Uint8Array(key.length / 2);
        if (regex.test(key)) {
            for (let byte = 0; byte < bytes.length; byte++) {
                bytes.set([parseInt(key === null || key === void 0 ? void 0 : key.slice(byte * 2, byte * 2 + 2), 16)], byte);
            }
            return Buffer.from(bytes);
        }
    }
    return undefined;
};
exports.hexify = hexify;
//+--------------------------------------------------------------------------------------+
//| Creates randomly generated uniqueKey (nanoid); returns in binary;                    |
//+--------------------------------------------------------------------------------------+
const hashKey = (length = 32) => {
    const hashKey = new Uint8Array(length / 2);
    const key = (0, exports.uniqueKey)(length);
    for (let byte = 0; byte * 2 < length; byte++) {
        hashKey.set([parseInt(key === null || key === void 0 ? void 0 : key.slice(byte * 2, byte * 2 + 2), 16)], byte);
    }
    return Buffer.from(hashKey);
};
exports.hashKey = hashKey;
//+--------------------------------------------------------------------------------------+
//| Given user properties identify the user, validates against a local hash;             |
//+--------------------------------------------------------------------------------------+
const hashPassword = (props) => {
    const length = 64;
    const message = JSON.stringify(props);
    const key = (0, node_crypto_1.createHash)("sha256").update(message).digest("hex");
    const hashKey = new Uint8Array(length / 2);
    for (let byte = 0; byte * 2 < length; byte++) {
        hashKey.set([parseInt(key === null || key === void 0 ? void 0 : key.slice(byte * 2, byte * 2 + 2), 16)], byte);
    }
    return Buffer.from(hashKey);
};
exports.hashPassword = hashPassword;
