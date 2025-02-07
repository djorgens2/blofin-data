"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.byInstrument = byInstrument;
exports.byCurrency = byCurrency;
exports.bySymbol = bySymbol;
exports.add = add;
const query_utils_1 = require("../query.utils");
function SplitSymbol(Symbol) {
    const symbol = Symbol.split('-');
    if (symbol.length === 1)
        symbol.push('USDT');
    return symbol;
}
function all() {
    return (0, query_utils_1.Select)("SELECT * FROM instrument;");
}
function byInstrument(Instrument) {
    return (0, query_utils_1.Select)(`SELECT * FROM instrument WHERE instrument = ${Instrument};`);
}
function byCurrency(Base, Quote) {
    return (0, query_utils_1.Select)(`SELECT * FROM instrument WHERE base_currency = ${Base} and quote_currency = ${Quote};`);
}
function bySymbol(Symbol) {
    const symbol = SplitSymbol(Symbol);
    return (0, query_utils_1.Select)(`SELECT * FROM instrument i, currency b, currency q WHERE i.base_currency = b.currency and i.quote_currency = q.currency and b.symbol = '${symbol[0]}' and q.symbol = '${symbol[1]}';`);
}
function add(Symbol) {
    const symbol = SplitSymbol(Symbol);
    return (0, query_utils_1.Modify)(`INSERT INTO instrument (base_currency, quote_currency) values('${symbol[0]}', '${symbol[1]}');`);
}
