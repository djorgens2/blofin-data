"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.bySourceRef = bySourceRef;
exports.add = add;
const query_utils_1 = require("../query.utils");
function all() {
    return (0, query_utils_1.Select)(`SELECT * FROM contract_type;`);
}
;
function bySourceRef(SourceRef) {
    return (0, query_utils_1.Select)(`SELECT * FROM contract_type WHERE source_ref=${SourceRef};`);
}
function add(Description, SourceRef) {
    return (0, query_utils_1.Modify)(`INSERT INTO contract_type (description, source_ref) VALUES ('${Description}','${SourceRef}');`);
}
