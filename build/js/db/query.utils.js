"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = Select;
exports.Modify = Modify;
const db_config_1 = __importDefault(require("./db.config"));
async function Select(Query) {
    const [results] = await db_config_1.default.execute(Query);
    return results;
}
async function Modify(Query) {
    const [results] = await db_config_1.default.execute(Query);
    return results;
}
