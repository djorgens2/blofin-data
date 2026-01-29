//+---------------------------------------------------------------------------------------+
//|                                                                               user.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TAccess, IAccess } from "db/interfaces/state";

import { Select, Insert, Update, TResponse } from "db/query.utils";
import { hashKey, hashPassword } from "lib/crypto.util";
import { hasValues, isEqual } from "lib/std.util";

import * as Roles from "db/interfaces/role";
import * as States from "db/interfaces/state";

export interface IUser {
  user: Uint8Array;
  username: string;
  email: string;
  password: string | Uint8Array;
  hash: Uint8Array;
  role: Uint8Array;
  title: string;
  state: Uint8Array;
  status: TAccess;
  image_url: string;
  total_users: number;
  similar_roles: number;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Creates/sets/resets user password;                                                   |
//+--------------------------------------------------------------------------------------+
export const SetPassword = async (props: Partial<IUser>) => {
  if (props === undefined) throw new Error(`Unauthorized password change event; no user specified`);
  else {
    const { username, email, password } = props;
    const hash = hashKey(32);
    const encrypt = hashPassword({ username, email, password, hash });
    const user: Partial<IUser> = {
      hash,
      password: encrypt,
    };
    return user;
  }
};

//+--------------------------------------------------------------------------------------+
//| Updates changes to User @ the local DB;                                              |
//+--------------------------------------------------------------------------------------+
export const Modify = async (props: Partial<IUser>): Promise<TResponse> => {
  if (hasValues(props)) {
    const user = await Fetch({ username: props.username, email: props.email });

    if (user) {
      const [current] = user;
      const role = props.role || (await Roles.Key({ title: props.title })) || undefined;
      const state = props.state || (await States.Key({ status: props.status })) || undefined;
      const revised: Partial<IUser> = {
        user: props.user,
        role: role && isEqual(role, current.role!) ? undefined : role,
        state: state && isEqual(state, current.state!) ? undefined : state,
        image_url: props.image_url && props.image_url === current.image_url ? undefined : props.image_url,
      };
      return await Update(revised, { table: `user`, keys: [{ key: `user` }], context: "User.Modify" });
    } else return { success: false, code: 404, response: `not_found`, rows: 0, context: "User.Modify" };
  } else return { success: false, code: 400, response: `null_query`, rows: 0, context: "User.Modify" };
};

//+--------------------------------------------------------------------------------------+
//| Adds new Users to local database;                                                    |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IUser>): Promise<IUser["user"] | undefined> => {
  const { username, email } = props;
  const user = await Key({ username, email });

  if (user === undefined) {
    const { hash, password } = await SetPassword({ username, email, password: props.password });
    const add: Partial<IUser> = {
      user: hashKey(6),
      role: props.role || (await Roles.Key({ title: props.title })) || (await Roles.Key({ title: "Viewer" })),
      username,
      email,
      hash,
      password,
      state: props.state || (await States.Key({ status: props.status })) || (await States.Key<IAccess>({ status: "Disabled" })),
      image_url: props.image_url || "./images/user/no-image.png",
    };
    const result = await Insert<IUser>(add, { table: `user`, context: "User.Add"  });

    return result.success ? add.user : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IUser>): Promise<IUser["user"] | undefined> => {
  if (hasValues<Partial<IUser>>(props)) {
    const [key] = await Select<IUser>(props, { table: `vw_users` });
    return key ? key.user : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IUser>): Promise<Array<Partial<IUser>> | undefined> => {
  const result = await Select<IUser>(props, { table: `vw_users` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns true|false if password hashes match on user supplied the text password;      |
//+--------------------------------------------------------------------------------------+
export const Login = async (props: Partial<IUser>): Promise<Partial<IUser>> => {
  const user = await Fetch({ username: props.username, email: props.email });

  if (user) {
    const [login] = user;
    const { password, username, email, hash } = login;
    if (password instanceof Uint8Array) {
      const encrypt = Buffer.from(password);
      const key = hashPassword({ username, email, password: props.password, hash });
      if (encrypt.toString("hex") === key.toString("hex")) {
        if (login.status === "Enabled") {
          Object.assign(login, { ...login, error: 0, message: "Connected" });
          return login;
        }
        Object.assign(login, { ...login, error: 301, message: `Your account is currently ['${login.status}']. Contact your administrator.` });
        return login;
      }
      Object.assign(login, { ...login, error: 302, message: `Invalid username or password.` });
      return login;
    }
    Object.assign(login, { ...login, error: 311, message: `Internal error. Contact your administrator.` });
    return login;
  }

  const error: Partial<IUser> = {};
  Object.assign(error, { ...props, error: 302, message: `Invalid user credentials.` });
  return error;
};
