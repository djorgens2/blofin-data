//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
exports.Add = Add;
exports.Key = Key;
exports.Fetch = Fetch;
exports.FetchDetail = FetchDetail;
exports.Update = Update;
exports.UpdateDetail = UpdateDetail;
const session_1 = require("@module/session");
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
const user_1 = require("@cli/interfaces/user");
const States = __importStar(require("@db/interfaces/state"));
const Environments = __importStar(require("@db/interfaces/environment"));
//+--------------------------------------------------------------------------------------+
//| Returns an array of 'verified new' accounts from .env ready for publishing;          |
//+--------------------------------------------------------------------------------------+
const Import = async () => {
    const keys = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT) : [``];
    const imports = [];
    for (let id in keys) {
        const { api, secret, phrase } = keys[id];
        (await Key({ api, secret, phrase })) === undefined && imports.push(keys[id]);
    }
    return imports;
};
exports.Import = Import;
//+--------------------------------------------------------------------------------------+
//| Adds all new accounts recieved from ui or any internal source to the database;       |
//+--------------------------------------------------------------------------------------+
async function Add(props) {
    const { user, broker, state, environment, alias } = props;
    const { api, secret, phrase, wss_url, rest_api_url, wss_public_url } = (0, session_1.Session)();
    const key = await Key({ api, secret, phrase });
    if (key === undefined) {
        const hmac = await (0, crypto_util_1.hashHmac)([api, secret, phrase]);
        const position = Math.floor(Math.random() * 82 + 1);
        const hash = Buffer.from([position, hmac.charCodeAt(position), hmac.charCodeAt(position + 1)]);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.account (account, broker, state, environment, wss_url, rest_api_url) VALUES (?, ?, ?, ?, ?, ?)`, [
            hash,
            broker,
            state,
            environment,
            wss_url,
            rest_api_url,
            wss_public_url,
        ]);
        await (0, query_utils_1.Modify)(`INSERT INTO blofin.user_account VALUES (?, ?, ?, ?)`, [user, hash, user, alias]);
        return hash;
    }
    (0, user_1.setUserToken)({ error: 312, message: `Duplicate Account ${alias} exists.` });
    return undefined;
}
//+--------------------------------------------------------------------------------------+
//| Examines account search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { account, api, secret, phrase } = props;
    const args = [];
    if (account) {
        args.push(account);
    }
    else if (api && secret && phrase) {
        const accounts = await Fetch({});
        for (let match in accounts) {
            const { account } = accounts[match];
            const hmac = await (0, crypto_util_1.hashHmac)([api, secret, phrase]);
            const slot = parseInt(account[0].toFixed(), 10);
            const hash = Buffer.from([slot, hmac.charCodeAt(slot), hmac.charCodeAt(slot + 1)]);
            if (hash.toString() === (account === null || account === void 0 ? void 0 : account.toString()))
                return hash;
        }
        return undefined;
    }
    else
        return undefined;
    const [result] = await (0, query_utils_1.Select)(`SELECT account FROM blofin.account WHERE account = ?`, args);
    return result === undefined ? undefined : result.account;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const { account, alias } = props;
    const args = [];
    let sql = `SELECT * FROM blofin.vw_accounts`;
    if (account) {
        args.push(account);
        sql += ` WHERE account = ?`;
    }
    else if (alias) {
        args.push(alias);
        sql += ` WHERE alias = ?`;
    }
    return await (0, query_utils_1.Select)(sql, args);
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function FetchDetail(props) {
    const { account, currency } = props;
    const args = [];
    const filters = [];
    let sql = `SELECT * FROM blofin.vw_accounts`;
    if (account) {
        args.push(account);
        filters.push(`account = ?`);
    }
    if (currency) {
        args.push(currency);
        filters.push(`currency = ?`);
    }
    filters.forEach((filter, id) => (sql += (id ? " AND " : " WHERE ") + filter));
    return await (0, query_utils_1.Select)(sql, args);
}
//+--------------------------------------------------------------------------------------+
//| Updates the account (master) from the API (select fields) or the UI;                 |
//+--------------------------------------------------------------------------------------+
async function Update(props) {
    const account = await Key((0, session_1.Session)());
    if (account) {
        const update = {
            state: (props === null || props === void 0 ? void 0 : props.state) ? props.state : (props === null || props === void 0 ? void 0 : props.status) ? await States.Key({ status: props.status }) : undefined,
            environment: (props === null || props === void 0 ? void 0 : props.environment) ? props.environment : (props === null || props === void 0 ? void 0 : props.environ) ? await Environments.Key({ environ: props.environ }) : undefined,
            total_equity: props === null || props === void 0 ? void 0 : props.total_equity,
            isolated_equity: props === null || props === void 0 ? void 0 : props.isolated_equity,
            wss_url: (0, session_1.Session)().wss_url,
            rest_api_url: (0, session_1.Session)().rest_api_url,
            wss_public_url: (0, session_1.Session)().wss_public_url,
            update_time: props === null || props === void 0 ? void 0 : props.update_time,
        };
        const [fields, args] = (0, query_utils_1.parseColumns)(update, ``);
        if (fields) {
            const sql = `UPDATE blofin.account SET ${fields.join(" = ?, ")}= FROM_UNIXTIME(?/1000) WHERE account = ?`;
            args.push(account);
            await (0, query_utils_1.Modify)(sql, args);
            (0, user_1.setUserToken)({ error: 0, message: `Account update applied.` });
            return 1;
        }
    }
    (0, user_1.setUserToken)({ error: 315, message: `Account not found.` });
    return undefined;
}
//+--------------------------------------------------------------------------------------+
//| Updates the account (master) from the API (select fields) or the UI;                 |
//+--------------------------------------------------------------------------------------+
async function UpdateDetail(props) {
    if (props.account && props.currency) {
        const update = {
            balance: props.balance ? props.balance : undefined,
            equity: props.equity ? props.equity : undefined,
            isolated_equity: props.isolated_equity ? props.isolated_equity : undefined,
            available: props.available ? props.available : undefined,
            available_equity: props.available_equity ? props.available_equity : undefined,
            equity_usd: props.equity_usd ? props.equity_usd : undefined,
            frozen: props.frozen ? props.frozen : undefined,
            order_frozen: props.order_frozen ? props.order_frozen : undefined,
            borrow_frozen: props.borrow_frozen ? props.borrow_frozen : undefined,
            unrealized_pnl: props.unrealized_pnl ? props.unrealized_pnl : undefined,
            isolated_unrealized_pnl: props.isolated_unrealized_pnl ? props.isolated_unrealized_pnl : undefined,
            coin_usd_price: props.coin_usd_price ? props.coin_usd_price : undefined,
            margin_ratio: props.margin_ratio ? props.margin_ratio : undefined,
            spot_available: props.spot_available ? props.spot_available : undefined,
            liability: props.liability ? props.liability : undefined,
            update_time: props.update_time ? props.update_time : undefined,
        };
        const [fields, args] = (0, query_utils_1.parseColumns)(update, ``);
        if (fields) {
            try {
                const sql = `INSERT INTO blofin.account_detail (account, currency, ${fields.join(", ")}) VALUES (${"".padEnd((args.length + 1) * 3, "?, ")}FROM_UNIXTIME(?/1000)) ` + `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")} = FROM_UNIXTIME(?/1000)`;
                args.unshift(props.account, props.currency, ...args);
                await (0, query_utils_1.Modify)(sql, args);
                (0, user_1.setUserToken)({ error: 0, message: `Account update applied.` });
                return 1;
            }
            catch (e) {
                console.log(e, props);
            }
        }
    }
    (0, user_1.setUserToken)({ error: 315, message: `Account not found.` });
    return undefined;
}
