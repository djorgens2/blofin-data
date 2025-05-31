//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Status } from "@db/interfaces/state";
import { Select, Modify, parseColumns } from "@db/query.utils";

import { hashHmac } from "@lib/crypto.util";
import { setUserToken } from "@cli/interfaces/user";

import * as States from "@db/interfaces/state";
import * as Environments from "@db/interfaces/environment";

export interface IKeyProps {
  account: Uint8Array | undefined;
  api: string;
  key: string;
  phrase: string;
  currency: Uint8Array | undefined;
  alias: string;
  owner: Uint8Array;
  user: Uint8Array;
  username: string;
  broker: Uint8Array;
  state: Uint8Array;
  status: string | Status;
  environment: Uint8Array;
  environ: string;
  wss_url: string;
  rest_api_url: string;
  total_equity: number;
  isolated_equity: number;
  balance: number;
  equity: number;
  available: number;
  available_equity: number;
  equity_usd: number;
  frozen: number;
  order_frozen: number;
  borrow_frozen: number;
  unrealized_pnl: number;
  isolated_unrealized_pnl: number;
  coin_usd_price: number;
  margin_ratio: number;
  spot_available: number;
  liability: number;
  update_time: number;
}

export interface IAccount extends IKeyProps, RowDataPacket {}

type TMutableProps = {
  state?: Uint8Array | undefined;
  environment?: Uint8Array | undefined;
  wss_url?: string | undefined;
  rest_api_url?: string | undefined;
  total_equity?: number | undefined;
  isolated_equity?: number | undefined;
  balance?: number | undefined;
  equity?: number | undefined;
  available?: number | undefined;
  available_equity?: number | undefined;
  equity_usd?: number | undefined;
  frozen?: number | undefined;
  order_frozen?: number | undefined;
  borrow_frozen?: number | undefined;
  unrealized_pnl?: number | undefined;
  isolated_unrealized_pnl?: number | undefined;
  coin_usd_price?: number | undefined;
  margin_ratio?: number | undefined;
  spot_available?: number | undefined;
  liability?: number | undefined;
  update_time?: number | undefined;
};

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
//| Adds all new accounts recieved from ui or any internal source to the database;       |
//+--------------------------------------------------------------------------------------+
export async function Add(props: Partial<IKeyProps>): Promise<IKeyProps["account"]> {
  const { api, key, phrase, user, broker, state, environment, alias, wss_url, rest_api_url } = props;
  const result = await Key(props);

  if (result === undefined) {
    const hmac = await hashHmac([api, key, phrase]);
    const position = Math.floor(Math.random() * 82 + 1);
    const hash = Buffer.from([position, hmac.charCodeAt(position), hmac.charCodeAt(position + 1)]);

    await Modify(`INSERT INTO blofin.account (account, broker, state, environment, wss_url, rest_api_url) VALUES (?, ?, ?, ?, ?, ?)`, [
      hash,
      broker,
      state,
      environment,
      wss_url,
      rest_api_url,
    ]);
    await Modify(`INSERT INTO blofin.user_account VALUES (?, ?, ?, ?)`, [user, hash, user, alias]);

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

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function FetchDetail(props: Partial<IKeyProps>): Promise<Array<Partial<IAccount>>> {
  const { account, currency } = props;
  const args = [];
  const filters = [];

  let sql: string = `SELECT * FROM blofin.vw_accounts`;

  if (account) {
    args.push(account);
    filters.push(`account = ?`);
  }
  if (currency) {
    args.push(currency);
    filters.push(`currency = ?`);
  }

  filters.forEach((filter, id) => (sql += (id ? " AND " : " WHERE ") + filter));
  return await Select<IAccount>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Updates the account (master) from the API (select fields) or the UI;                 |
//+--------------------------------------------------------------------------------------+
export async function Update(props: Partial<IKeyProps>): Promise<number | undefined> {
  const account = await Key(props);

  if (account) {
    const update: TMutableProps = {
      state: props?.state ? props.state : props?.status ? await States.Key({ status: props.status }) : undefined,
      environment: props?.environment ? props.environment : props?.environ ? await Environments.Key({ environ: props.environ }) : undefined,
      total_equity: props?.total_equity,
      isolated_equity: props?.isolated_equity,
      wss_url: props?.wss_url,
      rest_api_url: props?.rest_api_url,
      update_time: props?.update_time,
    };

    const [fields, args] = parseColumns<TMutableProps>(update, ``);

    if (fields) {
      const sql = `UPDATE blofin.account SET ${fields.join(" = ?, ")}= FROM_UNIXTIME(?/1000) WHERE account = ?`;
      args.push(account);
      await Modify(sql, args);
      setUserToken({ error: 0, message: `Account update applied.` });
      return 1;
    }
  }

  setUserToken({ error: 315, message: `Account not found.` });
  return undefined;
}

//+--------------------------------------------------------------------------------------+
//| Updates the account (master) from the API (select fields) or the UI;                 |
//+--------------------------------------------------------------------------------------+
export async function UpdateDetail(props: Partial<IKeyProps>): Promise<number | undefined> {
  if (props.account && props.currency) {
    const update: TMutableProps = {
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

    const [fields, args] = parseColumns<TMutableProps>(update, ``);

    if (fields) {
      try {
        const sql =
          `INSERT INTO blofin.account_detail (account, currency, ${fields.join(", ")}) VALUES (${"".padEnd(
            (args.length + 1) * 3,
            "?, "
          )}FROM_UNIXTIME(?/1000)) ` + `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")} = FROM_UNIXTIME(?/1000)`;
        args.unshift(props.account, props.currency, ...args);
        await Modify(sql, args);

        setUserToken({ error: 0, message: `Account update applied.` });
        return 1;
      } catch (e) {
        console.log(e, props!);
      }
    }
  }

  setUserToken({ error: 315, message: `Account not found.` });
  return undefined;
}
