"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.byPeriod = byPeriod;
const query_utils_1 = require("../query.utils");
function all() {
    return (0, query_utils_1.Select)("SELECT * FROM period_type;");
}
function byPeriod(period_type) {
    return (0, query_utils_1.Select)(`SELECT * FROM period_type WHERE short_name = '${period_type}';`);
}
