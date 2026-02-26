/**
 * User Identity and Persistence Model.
 * 
 * Orchestrates the lifecycle of User entities within the local database.
 * This module manages cryptographic security (hashing/salting), account state 
 * transitions, and complex multi-table lookups for roles and access levels.
 * 
 * @module User-Persistence-Model
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TAccess, IAccess } from "#db/interfaces/state";
import type { TResponse } from "#api";
import { Select, Insert, Update, Role, State } from "#db";
import { hashKey, hashPassword } from "#lib/crypto.util";
import { hasValues, isEqual } from "#lib/std.util";

/**
 * Defines the comprehensive User entity structure.
 */
export interface IUser {
  /** Unique binary identifier for the user. */
  user: Uint8Array;
  /** Unique login name. */
  username: string;
  /** Primary contact email address. */
  email: string;
  /** Encrypted password storage (Buffer/Uint8Array). */
  password: string | Uint8Array;
  /** The unique 32-byte cryptographic salt used for password hashing. */
  hash: Uint8Array;
  /** Binary key representing the user's assigned role. */
  role: Uint8Array;
  /** Human-readable title of the role. */
  title: string;
  /** Binary key representing the user's current account state. */
  state: Uint8Array;
  /** The current access status (e.g., 'Enabled', 'Disabled'). */
  status: TAccess;
  /** URL path to the user's profile avatar. */
  image_url: string;
  /** Computed field for total system users (aggregate). */
  total_users: number;
  /** Computed count of roles with similar hierarchical standing. */
  similar_roles: number;
  /** Timestamp of account creation. */
  create_time: Date;
  /** Timestamp of the last account modification. */
  update_time: Date;
}

/**
 * Generates cryptographic salts and hashes for a user password.
 * 
 * Applies a 32-byte unique salt to the raw password input to generate 
 * an encrypted Uint8Array for storage.
 * 
 * @param props - Object containing username, email, and raw password string.
 * @returns Partial user object containing the new 32-byte hash and encrypted password.
 * @throws Error if props are undefined.
 */
export const SetPassword = async (props: Partial<IUser>): Promise<Partial<IUser>> => {
  if (props === undefined) throw new Error(`Unauthorized password change event; no user specified`);
  
  const { username, email, password } = props;
  const hash = hashKey(32);
  const encrypt = hashPassword({ username, email, password, hash });
  
  return {
    hash,
    password: encrypt,
  };
};

/**
 * Persists changes to an existing User in the local database.
 * 
 * Performs a delta-check (via `isEqual`) to ensure only modified fields are 
 * passed to the Update query. Resolves Role and State keys dynamically if 
 * only titles or statuses are provided.
 * 
 * @param props - The updated user attributes.
 * @param context - Log tracing context (defaults to "User").
 * @returns A standard API response indicating success or failure.
 */
export const Save = async (props: Partial<IUser>, context = "User"): Promise<TResponse> => {
  context = `${context}.Save`;

  if (!hasValues(props)) {
    return { success: false, code: 400, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context };
  }

  const user = await Fetch({ username: props.username, email: props.email });

  if (user) {
    const [current] = user;
    const role = props.role || (await Role.Key({ title: props.title })) || undefined;
    const state = props.state || (await State.Key({ status: props.status })) || undefined;
    
    const revised: Partial<IUser> = {
      user: props.user,
      role: role && isEqual(role, current.role!) ? undefined : role,
      state: state && isEqual(state, current.state!) ? undefined : state,
      image_url: props.image_url && props.image_url === current.image_url ? undefined : props.image_url,
    };
    return await Update(revised, { table: `user`, keys: [[`user`]], context: "User.Modify" });
  }
  return { success: false, code: 404, state: `not_found`, message: `[Error] ${context}:`, rows: 0, context: "User.Modify" };
};

/**
 * Provisions a new User in the system.
 * 
 * Checks for existing identity, generates a 6-byte user key, and sets default 
 * roles ("Viewer") and states ("Disabled") if not explicitly provided.
 * 
 * @param props - New user registration data.
 * @param context - Log tracing context.
 * @returns The unique 6-byte user ID on success, or undefined if the user already exists.
 */
export const Add = async (props: Partial<IUser>, context = "User"): Promise<IUser["user"] | undefined> => {
  context = `${context}.Add`;

  const { username, email } = props;
  const user = await Key({ username, email });

  if (user === undefined) {
    const { hash, password } = await SetPassword({ username, email, password: props.password });
    const add: Partial<IUser> = {
      user: hashKey(6),
      role: props.role || (await Role.Key({ title: props.title })) || (await Role.Key({ title: "Viewer" })),
      username,
      email,
      hash,
      password,
      state: props.state || (await State.Key({ status: props.status })) || (await State.Key<IAccess>({ status: "Disabled" })),
      image_url: props.image_url || "./images/user/no-image.png",
    };
    const result = await Insert<IUser>(add, { table: `user`, context });

    return result.success ? add.user : undefined;
  } else return undefined;
};

/**
 * Retrieves a User's primary identifier based on seek parameters.
 * 
 * Targets the `vw_users` database view to resolve the primary binary key.
 * 
 * @param props - Search criteria (e.g., username, email).
 * @returns User ID or undefined if not found.
 */
export const Key = async (props: Partial<IUser>): Promise<IUser["user"] | undefined> => {
  if (hasValues<Partial<IUser>>(props)) {
    const result = await Select<IUser>(props, { table: `vw_users` });
    return result.success && result.data?.length ? result.data[0].user : undefined;
  } else return undefined;
};

/**
 * Fetches one or more user records from the system view.
 * 
 * @param props - Query filters applied to the `vw_users` view.
 * @returns An array of partial user objects or undefined on query failure.
 */
export const Fetch = async (props: Partial<IUser>): Promise<Array<Partial<IUser>> | undefined> => {
  const result = await Select<IUser>(props, { table: `vw_users` });
  return result.success ? result.data : undefined;
};

/**
 * Authenticates a user attempt against stored cryptographic hashes.
 * 
 * Validates the provided credentials against the stored salt and encrypted 
 * password. Checks for account status; accounts not marked 'Enabled' are 
 * rejected with specific status codes.
 * 
 * @param props - Login credentials (username/email and raw password).
 * @returns User object populated with error codes (301: Disabled, 302: Credentials) and status messages.
 */
export const Login = async (props: Partial<IUser>): Promise<Partial<IUser>> => {
  const user = await Fetch({ username: props.username, email: props.email });

  if (user) {
    const [login] = user;
    const { password, username, email, hash } = login;
    
    if (password instanceof Uint8Array) {
      const encrypt = Buffer.from(password);
      const key = hashPassword({ username, email, password: props.password, hash });
      
      if (isEqual(encrypt, key)) {
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
