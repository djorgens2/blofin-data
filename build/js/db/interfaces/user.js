//+---------------------------------------------------------------------------------------+
//|                                                                               user.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
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
exports.Count = void 0;
exports.SetPassword = SetPassword;
exports.Update = Update;
exports.Add = Add;
exports.Key = Key;
exports.Fetch = Fetch;
exports.Login = Login;
const query_utils_1 = require("@db/query.utils");
const crypto_util_1 = require("@lib/crypto.util");
const Roles = __importStar(require("@db/interfaces/role"));
const States = __importStar(require("@db/interfaces/state"));
//+--------------------------------------------------------------------------------------+
//| Creates/sets/resets user password;                                                   |
//+--------------------------------------------------------------------------------------+
async function SetPassword(props) {
    const { user, username, email, password } = props;
    const key = user ? user : await Key({ username, email });
    const hash = (0, crypto_util_1.hashKey)(32);
    const encrypt = (0, crypto_util_1.hashPassword)({ username, email, password, hash });
    if (key === undefined) {
        return [hash, encrypt];
    }
    else {
        const update = Update({ user: key, password: encrypt, hash });
    }
    return [];
}
//+--------------------------------------------------------------------------------------+
//| Updates changes to User @ the local DB;                                              |
//+--------------------------------------------------------------------------------------+
async function Update(props) {
    const { username, email, password, hash, title, status, image_url } = props;
    const user = props.user ? props.user : await Key({ username, email });
    const updateable = ["role", "hash", "password", "state", "image_url"];
    if (user === undefined) {
        Object.assign(props, Object.assign(Object.assign({}, props), { error: 304, message: `User not found.` }));
        return props;
    }
    const args = [];
    const fields = [];
    const role = props.role ? props.role : await Roles.Key({ title });
    const state = props.state ? props.state : await States.Key({ status });
    Object.assign(props, Object.assign(Object.assign({}, props), { role, state }));
    for (const [key, value] of Object.entries(props)) {
        if (value)
            if (updateable.includes(key)) {
                args.push(value);
                fields.push(`${key} = ?`);
            }
    }
    if (args.length > 0) {
        let sql = "UPDATE blofin.user SET ";
        fields.forEach((field, id) => (sql += field + (id < fields.length - 1 ? `, ` : ``)));
        sql += " WHERE user = ?";
        args.push(user);
        await (0, query_utils_1.Modify)(sql, args);
    }
    Object.assign(props, Object.assign(Object.assign({}, props), { error: 0, message: `User ['${username}'] updated successfully.` }));
    return props;
}
//+--------------------------------------------------------------------------------------+
//| Adds new Users to local database;                                                    |
//+--------------------------------------------------------------------------------------+
async function Add(props) {
    const { username, email, password, title, status } = props;
    const user = await Key({ username, email });
    if (user === undefined) {
        const key = (0, crypto_util_1.hashKey)(6);
        const [hash, encrypt] = await SetPassword({ username, email, password });
        const role = props.role ? props.role : title ? await Roles.Key({ title }) : await Roles.Key({ title: "Viewer" });
        const state = props.state ? props.state : status ? await States.Key({ status }) : await States.Key({ status: "Disabled" });
        const image_url = props.image_url ? props.image_url : "./images/user/no-image.png";
        if (role && state) {
            await (0, query_utils_1.Modify)(`INSERT INTO blofin.user ( user, username, email, role, hash, password, state, image_url) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [key, username, email, role, hash, encrypt, state, image_url]);
            Object.assign(props, Object.assign(Object.assign({}, props), { error: 0, message: `User ['${username}'] added successfully.` }));
            return props;
        }
    }
    Object.assign(props, Object.assign(Object.assign({}, props), { error: 303, message: `Invalid user credentials.` }));
    return props;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Key(props) {
    const { user, username, email } = props;
    const args = [];
    let sql = `SELECT user FROM blofin.user WHERE `;
    if (user) {
        args.push(user);
        sql += `user = ?`;
    }
    else if (username && email) {
        args.push(username, email);
        sql += `username = ? AND email = ?`;
    }
    else
        return undefined;
    const [key] = await (0, query_utils_1.Select)(sql, args);
    return key === undefined ? undefined : key.user;
}
//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
async function Fetch(props) {
    const args = [];
    const { user, username, email } = props;
    const state = props.state ? props.state : await States.Key({ status: props.status });
    let sql = `SELECT * FROM blofin.vw_users`;
    if (user) {
        args.push(user);
        sql += ` WHERE user = ?`;
    }
    else if (username && email) {
        args.push(username, email);
        sql += ` WHERE username = ? AND email = ?`;
    }
    else if (state) {
        args.push(state);
        sql += ` WHERE state = ?`;
    }
    return (0, query_utils_1.Select)(sql, args);
}
//+--------------------------------------------------------------------------------------+
//| Returns true|false if password hashes match on user supplied the text password;      |
//+--------------------------------------------------------------------------------------+
async function Login(props) {
    const { username, email } = props;
    const [user, packet] = await Fetch({ username, email });
    if (user) {
        const { password, hash } = user;
        if (password instanceof Uint8Array) {
            const encrypt = Buffer.from(password);
            const key = (0, crypto_util_1.hashPassword)({ username, email, password: props.password, hash });
            if (encrypt.toString("hex") === key.toString("hex")) {
                if (user.status === "Enabled") {
                    Object.assign(user, Object.assign(Object.assign({}, user), { error: 0, message: "Connected" }));
                    return user;
                }
                Object.assign(user, Object.assign(Object.assign({}, user), { error: 301, message: `Your account is currently ['${user.status}']. Contact your administrator.` }));
                return user;
            }
            Object.assign(user, Object.assign(Object.assign({}, user), { error: 302, message: `Invalid username or password.` }));
            return user;
        }
        Object.assign(user, Object.assign(Object.assign({}, props), { error: 311, message: `Internal error. Contact your administrator.` }));
        return user;
    }
    const error = {};
    Object.assign(error, Object.assign(Object.assign(Object.assign({}, props), packet), { error: 302, message: `Invalid user credentials.` }));
    return error;
}
//+--------------------------------------------------------------------------------------+
//| Returns #users in local db; used to determine if app requires initialization;        |
//+--------------------------------------------------------------------------------------+
const Count = async (props) => {
    const args = [];
    const filters = [];
    const role = (props === null || props === void 0 ? void 0 : props.role) ? props.role : await Roles.Key({ title: props === null || props === void 0 ? void 0 : props.title });
    const state = (props === null || props === void 0 ? void 0 : props.state) ? props.state : await States.Key({ status: props === null || props === void 0 ? void 0 : props.status });
    const sql = "SELECT count(*) AS total_users FROM blofin.user";
    if (role) {
        args.push(role);
        filters.push(`role = ?`);
    }
    if (state) {
        args.push(state);
        filters.push(`state = ?`);
    }
    let where = "";
    filters.forEach((filter, id) => (where += (id ? " AND " : " WHERE ") + filter));
    const [count] = await (0, query_utils_1.Select)(sql.concat(where), args);
    return count;
};
exports.Count = Count;
