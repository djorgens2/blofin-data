"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.bySymbol = bySymbol;
exports.add = add;
exports.setSuspense = setSuspense;
exports.setImageURL = setImageURL;
const query_utils_1 = require("../query.utils");
function all() {
    return (0, query_utils_1.Select)("SELECT * FROM currency;");
}
function bySymbol(Symbol) {
    return (0, query_utils_1.Select)(`SELECT * FROM currency WHERE symbol = '${Symbol}';`);
}
function add(Symbol, ImageURL, Suspense) {
    return (0, query_utils_1.Modify)(`INSERT INTO currency (symbol, image_url, suspense) VALUES ('${Symbol}','${ImageURL}', ${Suspense});`);
}
function setSuspense(Currency, Suspense) {
    return (0, query_utils_1.Modify)(`UPDATE currency SET (suspense) VALUES (${Suspense}) WHERE currency = ${Currency};`);
}
function setImageURL(Currency, ImageURL) {
    return (0, query_utils_1.Modify)(`UPDATE currency SET (image_url) VALUES ('${ImageURL}') WHERE currency = ${Currency};`);
}
