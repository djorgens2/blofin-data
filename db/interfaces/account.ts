//+--------------------------------------------------------------------------------------+
//|                                                                           account.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import { Status } from "@db/interfaces/state";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

import * as Brokers from "@db/interfaces/broker";
import * as Users from "@db/interfaces/user";

export interface IKeyProps {
  account?: Uint8Array;
  broker?: Uint8Array;
  owner?: Uint8Array;
  state?: Status;
  alias?: string;
}

export interface IAccount extends IKeyProps, RowDataPacket {
  position: number;
}

//+--------------------------------------------------------------------------------------+
//| Imports 'known' accounts from .env account keys array;                               |
//+--------------------------------------------------------------------------------------+
export async function Import(props: IKeyProps) {
  const { broker, owner, state, alias } = props;
  interface config {
    alias: string;
    api: string;
    key: string;
    phrase: string;
  }
  const brokers = await Brokers.Fetch({});
  const users = await Users.Fetch({});
  const local: Array<config> = process.env.APP_ACCCOUNT ? JSON.parse(process.env.APP_ACCCOUNT) : ``;

  if (local) {
    const db = await Fetch({});

    local.forEach((account) => {
      let found = false;

      db?.forEach((Account) => {
        if (hex(`0x${account.key.slice(Account.position! * 2, Account.position! * 2 + 6)}`)) found = true;
      });

      if (!found) {
        if (account.alias) {
          const position = Math.floor(Math.random() * 12 + 1);
          const key = hex(`0x${account.key.slice(position * 2, position * 2 + 6)}`, 3);

          Publish({
            account: key,
            alias: account.alias,
            broker: broker ? broker : brokers![0].broker,
            owner: owner ? owner : users![0].user,
            state: state ? state : Status.Disabled,
            position,
          });
        }
      }
    });
  }
}

//+--------------------------------------------------------------------------------------+
//| Adds all new accounts recieved from ui or any internal source to the database;        |
//+--------------------------------------------------------------------------------------+
//@ts-ignore
export async function Publish(props): Promise<IKeyProps["account"]> {
  const { account, alias, broker, owner, state, position} = props;
  const key = await Key({ alias });

  if (key === undefined) {
    await Modify(`INSERT INTO blofin.account VALUES (?, ?, ?, ?, ?, ?)`, [account, alias, broker, owner, state, position]);

    return key;
  }
  return account;
}

//+--------------------------------------------------------------------------------------+
//| Examines account search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["account"] | undefined> {
  const { account, alias } = props;
  const args = [];

  let sql: string = `SELECT account FROM blofin.account WHERE `;

  if (account) {
    args.push(hex(account, 3));
    sql += `account = ?`;
  } else if (alias) {
    args.push(alias);
    sql += `alias = ?`;
  } else return undefined;

  const [key] = await Select<IAccount>(sql, args);
  return key === undefined ? undefined : key.account;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<Partial<IAccount>> | undefined> {
  const { account, alias } = props;
  const args = [];

  let sql: string = `SELECT account FROM blofin.account`;

  if (account) {
    args.push(hex(account, 3));
    sql += ` WHERE account = ?`;
  } else if (alias) {
    args.push(alias);
    sql += ` WHERE alias = ?`;
  }

  const accounts = await Select<IAccount>(sql, args);
  return accounts === undefined ? undefined : accounts;
}
