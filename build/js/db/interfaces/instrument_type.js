"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.bySourceRef = bySourceRef;
const query_utils_1 = require("../query.utils");
function all() {
    return (0, query_utils_1.Select)("SELECT * FROM instrument_type;");
}
function bySourceRef(SourceRef) {
    return (0, query_utils_1.Select)(`SELECT * FROM instrument_type WHERE source_ref = '${SourceRef}';`);
}
