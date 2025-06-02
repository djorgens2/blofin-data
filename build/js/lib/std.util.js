//+--------------------------------------------------------------------------------------+
//|                                                                          std.util.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = exports.isLower = exports.isHigher = exports.isEqual = exports.isBetween = void 0;
exports.Pause = Pause;
exports.hexString = hexString;
exports.bufferString = bufferString;
exports.parseJSON = parseJSON;
exports.fileWrite = fileWrite;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
//+--------------------------------------------------------------------------------------+
//| Pauses console app execution;                                                        |
//+--------------------------------------------------------------------------------------+
async function Pause(message) {
    const { choice } = await (0, Prompts_1.default)(["choice"], { message, active: "continue", inactive: "exit", initial: true });
    if (!choice)
        process.exit(0);
}
//+--------------------------------------------------------------------------------------+
//| Returns a hex string for binary arrays; eg: 0xc0ffee returns '0xc0ffee'              |
//+--------------------------------------------------------------------------------------+
function hexString(uint8Array, length) {
    const hex = Array.from(uint8Array)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    return "0x" + hex.padStart(length, "0");
}
//+--------------------------------------------------------------------------------------+
//| Returns a buffer string for binary arrays; eg: 0xc0ffee returns '<Buffer c0 ff ee>'  |
//+--------------------------------------------------------------------------------------+
function bufferString(uint8Array) {
    const hex = Array.from(uint8Array)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");
    return `<Buffer ${hex}>`;
}
//+--------------------------------------------------------------------------------------+
//| Parses supplied string into a JSON|props object of <T> typically xfer'd via cli      |
//+--------------------------------------------------------------------------------------+
function parseJSON(arg) {
    try {
        const json = JSON.parse(arg);
        if (typeof json === "object" && json !== null) {
            const obj = Object.assign({}, json);
            return obj;
        }
    }
    catch (e) {
        //--- whitelist exceptions
        if (arg === "pong")
            // @ts-ignore
            return { event: "pong" };
        throw new Error(`Something jacked up; ${arg} is not a valid JSON;`);
    }
    return undefined;
}
//+--------------------------------------------------------------------------------------+
//| Returns true if value is in bounds conclusively; inside the bounds exclusively       |
//+--------------------------------------------------------------------------------------+
const isBetween = (source, bound1, bound2, inclusive = true, digits = 8) => {
    const highBound = parseFloat(Math.max(bound1, bound2).toFixed(digits));
    const lowBound = parseFloat(Math.min(bound1, bound2).toFixed(digits));
    const check = parseFloat(source.toFixed(digits));
    if (!inclusive)
        return check > lowBound && check < highBound;
    return lowBound === check || highBound === check;
};
exports.isBetween = isBetween;
//+--------------------------------------------------------------------------------------+
//| Returns true on equal comparison at a specified precision                            |
//+--------------------------------------------------------------------------------------+
const isEqual = (source, benchmark, digits = 8) => {
    const arg1 = typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits);
    const arg2 = typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits);
    return arg1 === arg2;
};
exports.isEqual = isEqual;
//+--------------------------------------------------------------------------------------+
//| Returns true on higher number|precision of the soruce(new) to benchmark(old)         |
//+--------------------------------------------------------------------------------------+
const isHigher = (source, benchmark, digits = 8) => {
    const arg1 = Number(typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits));
    const arg2 = Number(typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits));
    return arg1 > arg2;
};
exports.isHigher = isHigher;
//+--------------------------------------------------------------------------------------+
//| Returns true on lower number|precision of the soruce(new) to benchmark(old)          |
//+--------------------------------------------------------------------------------------+
const isLower = (source, benchmark, digits = 8) => {
    const arg1 = Number(typeof source === "string" ? parseFloat(source).toFixed(digits) : source.toFixed(digits));
    const arg2 = Number(typeof benchmark === "string" ? parseFloat(benchmark).toFixed(digits) : benchmark.toFixed(digits));
    return arg1 < arg2;
};
exports.isLower = isLower;
//+--------------------------------------------------------------------------------------+
//| Returns a numeric value formatted to a specified precision                           |
//+--------------------------------------------------------------------------------------+
const format = (value, digits = 8) => {
    const formatted = typeof value === "string" ? parseFloat(value).toFixed(digits) : value.toFixed(digits);
    return Number(formatted);
};
exports.format = format;
//+--------------------------------------------------------------------------------------+
//| Writes arrays of any type to the supplied file                                       |
//+--------------------------------------------------------------------------------------+
const fs = __importStar(require("node:fs"));
function fileWrite(filePath, array) {
    if (typeof Array.isArray(array) && array.length > 0) {
        try {
            const text = array.join("\n");
            fs.writeFileSync(filePath, text);
            console.log(`Array successfully written to ${filePath}`);
        }
        catch (error) {
            console.error(`Error writing to ${filePath}:`, error.message);
        }
    }
}
