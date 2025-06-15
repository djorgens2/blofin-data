//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
import Prompt, { IOption } from "@cli/modules/Prompts";
import type { RowDataPacket } from "mysql2";
import type { TSession, TState } from "@module/session";
import { IAccountState } from "@db/interfaces/state";

import { Session } from "@module/session";
import { Select, Modify, parseColumns } from "@db/query.utils";

import { hashHmac } from "@lib/crypto.util";
import { setUserToken } from "@cli/interfaces/user";

import * as States from "@db/interfaces/state";
import * as Brokers from "@db/interfaces/broker";
import * as Environments from "@db/interfaces/environment";

export interface IKeyProps {
  account: Uint8Array | undefined;
  currency: Uint8Array | undefined;
  api: string;
  secret: string;
  phrase: string;
  alias: string;
  owner: Uint8Array;
  user: Uint8Array;
  username: string;
  broker: Uint8Array;
  state: Uint8Array;
  status: IAccountState;
  environment: Uint8Array;
  environ: string;
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
  rest_api_url?: string | undefined;
  wss_url?: string | undefined;
  wss_public_url?: string | undefined;
}

export interface IAccount extends IKeyProps, RowDataPacket {}

type TMutableProps = {
  account?: Uint8Array;
  broker?: Uint8Array;
  state?: Uint8Array | undefined;
  status?: IAccountState | undefined;
  environment?: Uint8Array | undefined;
  rest_api_url?: string | undefined;
  wss_url?: string | undefined;
  wss_public_url?: string | undefined;
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
  const keys: Array<Partial<TSession>> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
  const imports: Array<Partial<TSession>> = [];

  for (let id in keys) {
    const { api, secret, phrase } = keys[id];
    (await Key({ api, secret, phrase })) === undefined && imports.push(keys[id]);
  }
  return imports;
};

//+--------------------------------------------------------------------------------------+
//| Adds all new accounts recieved from ui or any internal source to the database;       |
//+--------------------------------------------------------------------------------------+
export async function Add(props: Partial<IKeyProps>): Promise<IKeyProps["account"]> {
  const { api, secret, phrase, user, broker, state, status, environment, environ, alias } = props;
  const key = await Key({ api, secret, phrase });

  if (key === undefined) {
    const hmac = await hashHmac([api, secret, phrase]);
    const slot = Math.floor(Math.random() * 82 + 1);
    const hash = Buffer.from([slot, hmac.charCodeAt(slot), hmac.charCodeAt(slot + 1)]);
    const insert: TMutableProps = {
      account: hash,
      broker: broker ? broker : alias ? await Brokers.Key({ name: alias}) : undefined,
      // @ts-ignore
      state: state ? state : status ? await States.Key({ status }) : undefined,
      environment: environment ? environment : environ ? await Environments.Key({ environ }) : undefined,
      total_equity: parseFloat(props?.total_equity!.toFixed(3)),
      isolated_equity: parseFloat(props?.isolated_equity!.toFixed(3)),
      rest_api_url: props.rest_api_url,
      wss_url: props?.wss_url,
      wss_public_url: props?.wss_public_url
    }
    const [ fields, args ] = parseColumns(insert,``);
    const sql = `INSERT INTO blofin.account (${fields.join(', ')} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;
  
    await Modify( sql, args );
    await Modify(`INSERT INTO blofin.user_account VALUES (?, ?, ?, ?)`, [user, hash, user, alias]);

    return hash;
  }
  setUserToken({ error: 312, message: `Duplicate Account ${alias} exists.` });
  return undefined;
}

//+--------------------------------------------------------------------------------------+
//| Examines account search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
export async function Key(props: Partial<TSession>): Promise<IKeyProps["account"] | undefined> {
  const { account, api, secret, phrase } = props;
  const args = [];

  if (account) {
    args.push(account);
  } else if (api && secret && phrase) {
    const accounts = await Fetch({});

    for (const match in accounts) {
      const { account } = accounts[match];
      const hmac = await hashHmac([api, secret, phrase]);
      const slot = parseInt(account![0].toFixed(), 10);
      const hash = Buffer.from([slot, hmac.charCodeAt(slot), hmac.charCodeAt(slot + 1)]);
      
      if (hash.toString() === account?.toString()) return hash;
    }
    return undefined;
  } else return undefined;

  const [result] = await Select<IAccount>(`SELECT account FROM blofin.account WHERE account = ?`, args);
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
  const account = await Key(Session());

  if (account) {
    const update: TMutableProps = {
      // @ts-ignore
      state: props?.state ? props.state : props?.status ? await States.Key({ status: props?.status }) : undefined,
      environment: props?.environment ? props.environment : props?.environ ? await Environments.Key({ environ: props.environ }) : undefined,
      total_equity: parseFloat(props?.total_equity!.toFixed(3)),
      isolated_equity: parseFloat(props?.isolated_equity!.toFixed(3)),
      rest_api_url: Session().rest_api_url,
      wss_url: Session().wss_url,
      wss_public_url: Session().wss_public_url,
      update_time: props?.update_time! / 1000,
    };

    const [fields, args] = parseColumns<TMutableProps>(update, ``);

    if (fields) {
      const sql = `UPDATE blofin.account SET ${fields.join(" = ?, ")} = FROM_UNIXTIME(?) WHERE account = ?`;
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
