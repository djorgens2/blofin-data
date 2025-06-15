//+---------------------------------------------------------------------------------------+
//|                                                                               user.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TAccount } from "db/interfaces/state";

import { Modify, Select } from "@db/query.utils";
import { hashKey, hashPassword } from "@lib/crypto.util";

import * as Roles from "@db/interfaces/role";
import * as States from "@db/interfaces/state";

export interface IUser {
  user: Uint8Array;
  username: string;
  email: string;
  password: string | Uint8Array;
  hash: Uint8Array;
  role: Uint8Array;
  title: string;
  state: Uint8Array;
  status: TAccount;
  image_url: string;
  total_users?: number;
  create_time?: Date;
  update_time?: Date;
}

//+--------------------------------------------------------------------------------------+
//| Creates/sets/resets user password;                                                   |
//+--------------------------------------------------------------------------------------+
export async function SetPassword(props: Partial<IUser>) {
  const { user, username, email, password } = props;
  const key = user ? user : await Key({ username, email });
  const hash = hashKey(32);
  // @ts-ignore
  const encrypt = hashPassword({ username, email, password, hash });

  if (key === undefined) {
    return [hash, encrypt];
  } else {
    const update = Update({ user: key, password: encrypt, hash });
  }
  return [];
}

//+--------------------------------------------------------------------------------------+
//| Updates changes to User @ the local DB;                                              |
//+--------------------------------------------------------------------------------------+
export async function Update(props: Partial<IUser>): Promise<Partial<IUser>> {
  const { username, email, password, hash, title, status, image_url } = props;
  const user = props.user ? props.user : await Key({ username, email });
  const updateable = ["role", "hash", "password", "state", "image_url"];

  if (user === undefined) {
    Object.assign(props, { ...props, error: 304, message: `User not found.` });
    return props;
  }

  const args = [];
  const fields = [];
  const role = props.role ? props.role : await Roles.Key({ title });
  const state = props.state ? props.state : await States.Key({ status });

  Object.assign(props, { ...props, role, state });

  for (const [key, value] of Object.entries(props)) {
    if (value)
      if (updateable.includes(key)) {
        args.push(value);
        fields.push(`${key} = ?`);
      }
  }

  if (args.length > 0) {
    let sql: string = "UPDATE blofin.user SET ";
    fields.forEach((field, id) => (sql += field + (id < fields.length - 1 ? `, ` : ``)));

    sql += " WHERE user = ?";
    args.push(user);

    await Modify(sql, args);
  }
  Object.assign(props, { ...props, error: 0, message: `User ['${username}'] updated successfully.` });
  return props;
}

//+--------------------------------------------------------------------------------------+
//| Adds new Users to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export async function Add(props: Partial<IUser>): Promise<Partial<IUser>> {
  const { username, email, password, title, status } = props;
  const user = await Key({ username, email });

  if (user === undefined) {
    const key = hashKey(6);
    const [hash, encrypt] = await SetPassword({ username, email, password });
    const role = props.role ? props.role : title ? await Roles.Key({ title }) : await Roles.Key({ title: "Viewer" });
    const state = props.state ? props.state : status ? await States.Key({ status }) : await States.Key({ status: "Disabled" });
    const image_url = props.image_url ? props.image_url : "./images/user/no-image.png";

    if (role && state) {
      await Modify(
        `INSERT INTO blofin.user ( user, username, email, role, hash, password, state, image_url) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [key, username, email, role, hash, encrypt, state, image_url]
      );
      Object.assign(props, { ...props, error: 0, message: `User ['${username}'] added successfully.` });
      return props;
    }
  }
  Object.assign(props, { ...props, error: 303, message: `Invalid user credentials.` });
  return props;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Key(props: Partial<IUser>): Promise<IUser["user"] | undefined> {
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
export async function Fetch(props: Partial<IUser>): Promise<Array<Partial<IUser>>> {
  const args = [];
  const { user, username, email } = props;
  const state = props.state ? props.state! : await States.Key({ status: props.status });

  let sql: string = `SELECT * FROM blofin.vw_users`;

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
export async function Login(props: Partial<IUser>): Promise<Partial<IUser>> {
  const { username, email } = props;
  const [user, packet] = await Fetch({ username, email });

  if (user) {
    const { password, hash } = user;

    if (password instanceof Uint8Array) {
      const encrypt = Buffer.from(password);
      // @ts-ignore
      const key = hashPassword({ username, email, password: props.password, hash });
      if (encrypt.toString("hex") === key.toString("hex")) {
        if (user.status === "Enabled") {
          Object.assign(user, { ...user, error: 0, message: "Connected" });
          return user;
        }
        Object.assign(user, { ...user, error: 301, message: `Your account is currently ['${user.status}']. Contact your administrator.` });
        return user;
      }
      Object.assign(user, { ...user, error: 302, message: `Invalid username or password.` });
      return user;
    }
    Object.assign(user, { ...props, error: 311, message: `Internal error. Contact your administrator.` });
    return user;
  }

  const error: Partial<IUser> = {};
  Object.assign(error, { ...props, ...packet, error: 302, message: `Invalid user credentials.` });
  return error;
}

//+--------------------------------------------------------------------------------------+
//| Returns #users in local db; used to determine if app requires initialization;        |
//+--------------------------------------------------------------------------------------+
export const Count = async (props: IUser) => {
  const args = [];
  const filters = [];
  const role = props?.role ? props.role : await Roles.Key({ title: props?.title });
  const state = props?.state ? props.state : await States.Key({ status: props?.status });
  const sql = "SELECT count(*) AS total_users FROM blofin.user";

  if (role) {
    args.push(role);
    filters.push(`role = ?`);
  }

  if (state) {
    args.push(state);
    filters.push(`state = ?`);
  }

  let where: string = "";
  filters.forEach((filter, id) => (where += (id ? " AND " : " WHERE ") + filter));

  const [count] = await Select<IUser>(sql.concat(where), args);

  return count;
};
