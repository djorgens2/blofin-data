/**
 * Core Account Management and Authentication.
 * 
 * Manages the primary trading account records, including credential validation,
 * master record creation, and metadata synchronization with users and brokers.
 * 
 * @module db/account
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { ISession } from "#module/session";
import type { IAccess, TAccess } from "#db/interfaces/state";
import type { IPublishResult, TResponse } from "#api";

import UserToken, { setUserToken } from "#cli/interfaces/user";
import { State, User, Broker, Environment } from "#db";
import { Session } from "#module/session";

import { Select, Insert, Update, PrimaryKey } from "#db";
import { hashHmac } from "#lib/crypto.util";
import { isEqual } from "#lib/std.util";

/**
 * Primary interface for the Account Master record.
 * Maps to the `account` table and `vw_accounts` view.
 */
export interface IAccount {
  /** Primary Key: Unique 3-byte hash derived from HMAC credentials. */
  account: Uint8Array;
  /** Human-readable display name for the account. */
  alias: string;
  /** Foreign Key: Reference to the Broker table. */
  broker: Uint8Array;
  broker_name: string;
  /** Foreign Key: Reference to the User (Owner) table. */
  owner: Uint8Array;
  owner_name: string;
  /** Foreign Key: Access state hash. */
  state: Uint8Array;
  /** Human-readable access status (e.g., 'Enabled', 'Restricted'). */
  status: TAccess;
  /** Foreign Key: Deployment environment (Live/Demo). */
  environment: Uint8Array;
  environ: string;
  /** Global margin calculation mode. */
  margin_mode: "cross" | "isolated";
  /** Indicates if one-way or hedge mode is active. */
  hedging: boolean;
  broker_image_url: string;
  broker_website_url: string;
  owner_email: string;
  owner_image_url: string;
  /** REST API base endpoint. */
  rest_api_url: string;
  /** Authenticated WebSocket endpoint. */
  private_wss_url: string;
  /** Public market data WebSocket endpoint. */
  public_wss_url: string;
  /** Combined account value in USD. */
  total_equity: number;
  /** Equity specifically locked in isolated margin. */
  isolated_equity: number;
  /** Foreign Key: Base account currency. */
  currency: Uint8Array;
  account_currency: string;
  currency_image_url: string;
  currency_state: Uint8Array;
  currency_status: string;
  balance: number;
  currency_equity: number;
  currency_isolated_equity: number;
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
  /** Timestamp of the last equity or state update. */
  update_time: Date;
}

/**
 * Parses and retrieves account credentials stored in environment variables.
 * 
 * @param filter - If set to 'New', returns only accounts not yet present in the DB. 
 *                 If 'All', returns everything found in `APP_ACCOUNT`.
 * @returns A promise resolving to an array of session credentials.
 */
export const Available = async (filter: "New" | "All"): Promise<Array<Partial<ISession>>> => {
  const accounts = process.env.APP_ACCOUNT;
  if (!accounts) return [];

  let sessions: Array<Partial<ISession>>;
  try {
    sessions = JSON.parse(accounts);
  } catch (e) {
    console.error("-> [Error] Failed to parse account keys");
    return [];
  }

  if (filter === "All") return sessions;

  const missing = await Promise.all(
    sessions.map(async (account) => {
      const { api, secret, phrase } = account;
      const isNew = (await Key({ api, secret, phrase })) === undefined;
      return isNew ? account : undefined;
    }),
  );

  return missing.filter((acc): acc is Partial<ISession> => acc !== undefined);
};

/**
 * Initializes a new trading account record in the local database.
 * 
 * Process Flow:
 * 1. Validates that the account does not already exist via HMAC lookup.
 * 2. Generates a unique 3-byte primary key using a random slot and HMAC buffer.
 * 3. Resolves foreign keys for Owner, Broker, State, and Environment by name/alias.
 * 4. Persists the master record with initialized equity values.
 * 
 * @param props - Metadata for the account (alias, URLs, status).
 * @param session - Security credentials used to derive the unique account hash.
 * @returns A promise resolving to the publication result and the new primary key.
 */
export const Add = async (props: Partial<IAccount>, session: Partial<ISession>): Promise<IPublishResult<IAccount>> => {
  const exists = await Key(session);

  if (exists) {
    setUserToken({ error: 312, message: `Duplicate account ${props.alias} exists.` });
    return { key: undefined, response: { success: false, code: 312, state: `duplicate_acount`, message: `Error`, rows: 0, context: "Account.Add" } };
  }

  const hmac = await hashHmac(session);

  if (hmac) {
    const slot = Math.floor(Math.random() * 82 + 1);
    const hash = Buffer.from([slot, hmac.charCodeAt(slot), hmac.charCodeAt(slot + 1)]);
    const account: Partial<IAccount> = {
      account: hash,
      alias: props.alias,
      owner: props.owner || (await User.Key({ username: props.owner_name })) || undefined,
      broker: props.broker || (await Broker.Key({ name: props.broker_name })) || undefined,
      state: props.state || (props.status ? await State.Key<IAccess>({ status: props.status }) : undefined) || undefined,
      environment: props.environment || (await Environment.Key({ environ: props.environ })) || undefined,
      total_equity: 0,
      isolated_equity: 0,
      rest_api_url: props.rest_api_url,
      private_wss_url: props.private_wss_url,
      public_wss_url: props.public_wss_url,
    };
    const result = await Insert<IAccount>(account, { table: `account` });
    return { key: PrimaryKey(account, ["account"]), response: result };
  }
  setUserToken({ error: 315, message: `Invalid session credentials.` });
  return {
    key: undefined,
    response: { success: false, code: 315, state: `error`, message: `[Error] Invalid or unauthorized session credentials`, rows: 0, context: "Account.Add" },
  };
};

/**
 * Synchronizes global account equity and status updates from the UI or API.
 * 
 * Performs a "diff-check" to ensure only changed fields are sent to the database.
 * Validates the incoming account hash against the current {@link Session} to 
 * prevent unauthorized cross-account data publication.
 * 
 * @param props - Partial account object containing updated equity or status.
 * @returns A promise resolving to the database update result and account key.
 * @throws {Error} If the provided account hash does not match the active session.
 */
export const Publish = async (props: Partial<IAccount>): Promise<IPublishResult<IAccount>> => {
  if (!isEqual(Session().account!, props.account!)) {
    setUserToken({ error: 315, message: `Unauthorized account publication; invalid session account` }, props);
    throw new Error(UserToken().message);
  }

  const account = await Fetch({ account: props.account });

  if (!account) {
    setUserToken({ error: 315, message: `Unauthorized account publication; invalid session account` }, props);
    throw new Error(UserToken().message);
  }

  const [current] = account;
  const revised: Partial<IAccount> = {
    account: current.account,
    total_equity: isEqual(props.total_equity!, current.total_equity!) ? undefined : props.total_equity,
    isolated_equity: isEqual(props.isolated_equity!, current.isolated_equity!) ? undefined : props.isolated_equity,
    update_time: isEqual(props.update_time!, current.update_time!) ? undefined : props.update_time,
  };
  const result: TResponse = await Update(revised, { table: `account`, keys: [[`account`]] });
  return { key: PrimaryKey(current, ["account"]), response: result };
};

/**
 * Updates granular asset-level metrics (balances, margin, PnL) per currency.
 * 
 * Logic Flow:
 * 1. Checks for existing data in the `account_detail` table for the account/currency pair.
 * 2. If present: Performs a field-by-field delta check and {@link Update}s only modified values.
 * 3. If absent: Performs an {@link Insert} to initialize tracking for the new asset.
 * 
 * @param props - Asset-specific metrics including balance, equity, and frozen funds.
 * @returns A promise resolving to the record's composite key (account + currency) and result.
 * @throws {Error} If both account and currency identifiers are not provided.
 */
export const PublishDetail = async (props: Partial<IAccount>): Promise<IPublishResult<IAccount>> => {
  if (!props.account || !props.currency) {
    setUserToken({ error: 315, message: `Unauthorized account publication; invalid session account` }, props);
    throw new Error(UserToken().message);
  }

  const account = await Fetch({ account: props.account, currency: props.currency });

  if (account) {
    const [current] = account;
    const revised: Partial<IAccount> = {
      account: current.account,
      currency: current.currency,
      balance: isEqual(props.balance!, current.balance!) ? undefined : props.balance,
      currency_equity: isEqual(props.currency_equity!, current.currency_equity!) ? undefined : props.currency_equity,
      currency_isolated_equity: isEqual(props.currency_isolated_equity!, current.currency_isolated_equity!) ? undefined : props.currency_isolated_equity,
      available: isEqual(props.available!, current.available!) ? undefined : props.available,
      available_equity: isEqual(props.available_equity!, current.available_equity!) ? undefined : props.available_equity,
      equity_usd: isEqual(props.equity_usd!, current.equity_usd!) ? undefined : props.equity_usd,
      frozen: isEqual(props.frozen!, current.frozen!) ? undefined : props.frozen,
      order_frozen: isEqual(props.order_frozen!, current.order_frozen!) ? undefined : props.order_frozen,
      borrow_frozen: isEqual(props.borrow_frozen!, current.borrow_frozen!) ? undefined : props.borrow_frozen,
      unrealized_pnl: isEqual(props.unrealized_pnl!, current.unrealized_pnl!) ? undefined : props.unrealized_pnl,
      isolated_unrealized_pnl: isEqual(props.isolated_unrealized_pnl!, current.isolated_unrealized_pnl!) ? undefined : props.isolated_unrealized_pnl,
      coin_usd_price: isEqual(props.coin_usd_price!, current.coin_usd_price!) ? undefined : props.coin_usd_price,
      margin_ratio: isEqual(props.margin_ratio!, current.margin_ratio!) ? undefined : props.margin_ratio,
      spot_available: isEqual(props.spot_available!, current.spot_available!) ? undefined : props.spot_available,
      liability: isEqual(props.liability!, current.liability!) ? undefined : props.liability,
      update_time: isEqual(props.update_time!, current.update_time!) ? undefined : props.update_time,
    };

    const result: TResponse = await Update(revised, { table: `account_detail`, keys: [[`account`], [`currency`]] });

    setUserToken({ error: parseInt(String(result.code)), message: result.success ? `Account details update applied.` : `Account details update failed.` });
    return { key: PrimaryKey(current, ["account", "currency"]), response: result } as IPublishResult<IAccount>;
  }

  const result = await Insert<IAccount>(props, { table: `account_detail` });

  setUserToken({ error: parseInt(String(result.code)), message: result.success ? `New Account details Imported.` : `Failed to import account details.` });
  return { key: PrimaryKey(props, ["account", "currency"]), response: result } as IPublishResult<IAccount>;
};

/**
 * Resolves the unique account hash for a set of API credentials.
 * 
 * This is a security-critical method that:
 * 1. If an `account` hash is provided, verifies its existence in the DB.
 * 2. If credentials (API/Secret/Phrase) are provided, it iterates through known 
 *    accounts and re-derives the 3-byte HMAC hash to find a cryptographic match.
 * 
 * @param props - Session credentials or an existing account hash.
 * @returns The matching Uint8Array account key, or undefined if no match is found.
 */
export const Key = async (props: Partial<ISession>): Promise<IAccount["account"] | undefined> => {
  const { account, api, secret, phrase } = props;

  if (account) {
    const result = await Fetch({ account });
    return result === undefined ? undefined : account;
  } else {
    if (api && secret && phrase) {
      const accounts = await Fetch({});

      if (accounts)
        for (const { account } of accounts) {
          const hmac = await hashHmac(props);

          if (hmac) {
            const slot = account![0];
            const hash = Buffer.from([slot, hmac.charCodeAt(slot), hmac.charCodeAt(slot + 1)]);

            if (isEqual(hash, account!)) return hash;
          }
        }
    }
  }
  return undefined;
};
/**
 * Retrieves account records from the comprehensive `vw_accounts` database view.
 * 
 * @param props - Query filters (e.g., specific account hash or owner). 
 *                Pass `{}` to fetch all accounts accessible to the system.
 * @returns An array of partial account records or undefined if the query fails.
 */
export const Fetch = async (props: Partial<IAccount>): Promise<Array<Partial<IAccount>> | undefined> => {
  const result = await Select<IAccount>(props, { table: `vw_accounts` });
  console.log({account: props.account, fetchResult: result});
  return result.success ? result.data : undefined;
};
