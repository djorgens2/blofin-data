"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.direction = exports.bias = exports.directionChanged = exports.splitSymbol = exports.Role = exports.Bias = exports.Action = exports.Direction = void 0;
exports.clear = clear;
exports.Direction = {
    None: 0,
    Up: 1,
    Down: -1,
    Flat: 2,
    Pend: -2,
};
exports.Action = {
    None: "No Action",
    Buy: "Buy",
    Sell: "Sell",
    Wait: "Wait",
};
exports.Bias = {
    None: 0,
    Short: -1,
    Long: 1,
};
exports.Role = {
    Unassigned: "Unassigned",
    Seller: "Seller",
    Buyer: "Buyer",
};
//+--------------------------------------------------------------------------------------+
//| Returns initialized Message header (clone) with identity retention (symbol);         |
//+--------------------------------------------------------------------------------------+
function clear(message) {
    return {
        state: message.state,
        symbol: message.symbol,
        node: message.node,
        code: 0,
        success: true,
        text: "",
        timestamp: Date.now(),
        db: {
            insert: 0,
            update: 0,
        },
        events: {
            fractal: 0,
            sma: 0,
        },
        account: {
            open: 0,
            close: 0,
        },
    };
}
//+--------------------------------------------------------------------------------------+
//| Returns Blofin instrument symbols from pair; forces 'USDT' on empty second           |
//+--------------------------------------------------------------------------------------+
const splitSymbol = (symbol) => {
    const symbols = typeof symbol === "string" ? symbol.split("-") : typeof Array.isArray(symbol) ? symbol[0].split("-") : [];
    symbols.length === 1 && symbols.push("USDT");
    symbols[1].length === 0 && symbols.splice(1, 1, "USDT");
    return symbols.slice(0, 2);
};
exports.splitSymbol = splitSymbol;
//+--------------------------------------------------------------------------------------+
//| Returns true if all conditions are met to signal a change in direction               |
//+--------------------------------------------------------------------------------------+
const directionChanged = (oldDirection, newDirection) => {
    if (newDirection === exports.Direction.None)
        return false;
    if (oldDirection === newDirection)
        return false;
    return true;
};
exports.directionChanged = directionChanged;
//+--------------------------------------------------------------------------------------+
//| Returns the direction key derived from supplied value                                |
//+--------------------------------------------------------------------------------------+
const bias = (direction) => {
    return direction === exports.Direction.Up ? exports.Bias.Long : direction === exports.Direction.Down ? exports.Bias.Short : exports.Bias.None;
};
exports.bias = bias;
//+--------------------------------------------------------------------------------------+
//| Returns the direction key derived from supplied value                                |
//+--------------------------------------------------------------------------------------+
const direction = (value) => {
    return value > 0 ? exports.Direction.Up : value < 0 ? exports.Direction.Down : exports.Direction.None;
};
exports.direction = direction;
