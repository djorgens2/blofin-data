"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.byInstrument = byInstrument;
exports.merge = merge;
const query_utils_1 = require("../query.utils");
function all() {
    return (0, query_utils_1.Select)(`SELECT * FROM instrument_detail;`);
}
function byInstrument(Instrument, Period) {
    return (0, query_utils_1.Select)(`SELECT * FROM candle WHERE instrument_detail = '${Instrument}' AND period_type='${Period}';`);
}
function merge(Instrument, Period, candle) {
    return (0, query_utils_1.Modify)(`INSERT INTO candle values (${candle[0]}, ${candle[0]});`);
}
