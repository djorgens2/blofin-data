//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Status } from "@db/interfaces/state";
import { Select, Modify } from "@db/query.utils";

import * as Brokers from "@db/interfaces/broker";
import * as Users from "@db/interfaces/user";
import { hashHmac, hexify } from "@lib/crypto.util";
import { setUserToken } from "@cli/interfaces/user";

export interface IKeyProps {
  account: Uint8Array | undefined;
  alias: string;
  owner: Uint8Array;
  user: Uint8Array;
  username: string;
  broker: Uint8Array;
  state: Uint8Array;
  status: string | Status;
  api: string;
  key: string;
  phrase: string;
  environment: Uint8Array;
  wss_url: string;
  rest_api_url: string;
}
export interface IAccount extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Returns an array of 'verified new' accounts from .env ready for publishing;          |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  const keys: Array<Partial<IAccount>> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
  const imports: Array<Partial<IAccount>> = [];

  for (let id in keys) {
    const { api, key, phrase } = keys[id];

    (await Key({ api, key, phrase })) === undefined && imports.push(keys[id]);
  }
  return imports;
};

//+--------------------------------------------------------------------------------------+
//| Adds all new accounts recieved from ui or any internal source to the database;        |
//+--------------------------------------------------------------------------------------+
export async function Add(props: Partial<IKeyProps>): Promise<IKeyProps["account"]> {
  const { api, key, phrase, user, broker, state, environment, alias, wss_url, rest_api_url } = props;
  const result = await Key(props);

  if (result === undefined) {
    const hmac = await hashHmac([api, key, phrase]);
    const position = Math.floor(Math.random() * 82 + 1);
    const hash = Buffer.from([position, hmac.charCodeAt(position), hmac.charCodeAt(position + 1)]);

    await Modify(`INSERT INTO blofin.account VALUES (?, ?, ?, ?, ?, ?)`, [hash, broker, state, environment, wss_url, rest_api_url]);
    await Modify(`INSERT INTO blofin.user_account VALUES (?, ?, ?, ?)`,[user, hash, user, alias]);

    return hash;
  }
  setUserToken({ error: 312, message: `Duplicate Account ${alias} exists.` });
  return undefined;
}

//+--------------------------------------------------------------------------------------+
//| Examines account search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
export async function Key(props: Partial<IKeyProps>): Promise<IKeyProps["account"] | undefined> {
  const { account, api, key, phrase } = props;
  const args = [];

  let sql: string = `SELECT account FROM blofin.account WHERE account = ?`;

  if (account) {
    args.push(account);
  } else if (api && key && phrase) {
    const accounts = await Fetch({});
  
    for (let match in accounts) {
      const { account } = accounts[match];
      const hmac = await hashHmac([api, key, phrase]);
      const slot = parseInt(account![0].toFixed(), 10);
      const hash = Buffer.from([slot, hmac.charCodeAt(slot), hmac.charCodeAt(slot + 1)]);
  
      if (hash.toString() === account?.toString()) return hash;
    }
    return undefined;
  } else return undefined;

  const [result] = await Select<IAccount>(sql, args);
  return result === undefined ? undefined : result.account;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IKeyProps>): Promise<Array<Partial<IAccount>>> {
  const { account, alias } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.vw_accounts`;

  if (account) {
    args.push(account);
    sql += ` WHERE account = ?`;
  } else if (alias) {
    args.push(alias);
    sql += ` WHERE alias = ?`;
  }

  return await Select<IAccount>(sql, args);
}
