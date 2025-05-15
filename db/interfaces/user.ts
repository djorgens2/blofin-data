//+---------------------------------------------------------------------------------------+
//|                                                                               user.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Modify, Select } from "@db/query.utils";
import { hashKey, hashPassword } from "@/lib/crypto.util";
import { Status } from "@db/interfaces/state";

import * as Roles from "@db/interfaces/role";
import * as States from "@db/interfaces/state";

export interface IKeyProps {
  user?: Uint8Array;
  username: string;
  email: string;
  password?: string | Uint8Array;
  hash?: Uint8Array;
  role?: Uint8Array;
  title?: string;
  state?: Uint8Array;
  status?: Status;
  image_url?: string;
}
export interface IUser extends IKeyProps, RowDataPacket {
  create_time?: Date;
  update_time?: Date;
}

//+--------------------------------------------------------------------------------------+
//| Adds new Users to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export async function Add(props: IKeyProps): Promise<IKeyProps["user"]> {
  const { username, email, password, title } = props;
  const user = await Key({ username, email });

  if (user === undefined) {
    const key = hashKey(6);
    const hash = hashKey(32);
    const encrypt = hashPassword({ username, email, password, hash });
    const role = props.role ? props.role : await Roles.Key({ title });
    const image_url = props.image_url ? props.image_url : "./images/user/no-image.png";
    const state = props.state ? props.state : await States.Key({ status: Status.Disabled });

    await Modify(
      `INSERT INTO blofin.user ( user, username, email, role, hash, password, state, image_url) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [key, username, email, role, hash, encrypt, state, image_url]
    );
    return key;
  }
  return user;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["user"] | undefined> {
  const { user, username, email } = props;
  const args = [];

  let sql: string = `SELECT user FROM blofin.user WHERE `;

  if (user) {
    args.push(user);
    sql += `user = ?`;
  } else if (username && email) {
    args.push(username, email);
    sql += `username = ? AND email = ?`;
  } else return undefined;

  const [key] = await Select<IUser>(sql, args);
  return key === undefined ? undefined : key.user;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<Partial<IUser>>> {
  const args = [];
  const { user, username, email } = props;
  const state = props.state ? props.state! : await States.Key({ status: props.status });

  let sql: string = `SELECT * FROM blofin.user`;

  if (user) {
    args.push(user);
    sql += ` WHERE user = ?`;
  } else if (username && email) {
    args.push(username, email);
    sql += ` WHERE username = ? AND email = ?`;
  } else if (state) {
    args.push(state);
    sql += ` WHERE state = ?`;
  }

  return Select<IUser>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Returns true|false if password hashes match on user supplied the text password;      |
//+--------------------------------------------------------------------------------------+
export async function Login(props: IKeyProps): Promise<Partial<IUser> | undefined> {
  const { username, email } = props;
  const [user] = await Fetch({ username, email });

  if (user) {
    const { password, hash } = user;

    if (password instanceof Uint8Array) {
      const encrypt = Buffer.from(password);
      const key = hashPassword({ username, email, password: props.password, hash });
      if (encrypt.toString("hex") === key.toString("hex")) return user;
    }
  }
  return undefined;
}

//+--------------------------------------------------------------------------------------+
//| Returns the number of existing users; used to determine if app requires initializing; |
//+--------------------------------------------------------------------------------------+
export const Count = async (): Promise<number> => {
  const [count] = await Select<number>("SELECT count(*) AS count FROM blofin.user", []);
  return count;
};
