//+--------------------------------------------------------------------------------------+
//|                                                                             State.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
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
exports.setState = void 0;
const Prompts_1 = __importDefault(require("@cli/modules/Prompts"));
const States = __importStar(require("@db/interfaces/state"));
//+--------------------------------------------------------------------------------------+
//| Retrieves state assignments in prompt format;                                        |
//+--------------------------------------------------------------------------------------+
const setState = async (props) => {
    const states = await States.Fetch({});
    const choices = [];
    if (states) {
        if (props === null || props === void 0 ? void 0 : props.state)
            return states.find(({ state }) => state.toString() === props.state.toString());
        if (props === null || props === void 0 ? void 0 : props.status)
            return states.find(({ status }) => status === props.status);
        states.forEach((option) => {
            choices.push({
                title: option.status,
                value: option.state,
            });
        });
        const { select } = await (0, Prompts_1.default)(["select"], { message: "  Select a State:", choices });
        const choice = choices.find(({ value }) => value.toString() === select.toString());
        return { state: choice.value, status: choice.title };
    }
};
exports.setState = setState;
