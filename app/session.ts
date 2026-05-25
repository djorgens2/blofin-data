/**
 * @module Session
 * @description Core session management and authentication for the Blofin Trading Engine.
 * Handles environment-based configuration, vertical parameter hydration,
 * and HMAC-SHA256 signature generation for REST/WSS requests.
 */

"use strict";

import type { IAccount } from "#db/interfaces/account";
import type { IPublishResult } from "#api";
import type { IMessage } from "#lib/ipc.util";
import type { ILogger } from "#lib/log.util";

import { withSystem } from "#lib/log.util";
import { hexString, parseJSON } from "#lib/std.util";
import { uniqueKey } from "#lib/crypto.util";
import { createHmac } from "node:crypto";
import { TextEncoder } from "node:util";
import { createResponse, SC } from "#api/lexicon";
import { Positions, Accounts, Orders } from "#api";
import { Select, Account } from "#db";

import cluster from "node:cluster";

/**
 * Represents the core logic to be executed once authorized.
 * It must return a collection of results for the given type T.
 */
type SessionCallback<T> = (session: ISession) => Promise<T> | T;

/**
 * Interface for access to app configuration options; set in the database.
 *
 * Database objects required for successful operation:
 *  @view vw_app_config - resoves default v. actual param_value.
 *  @table app_config - stores param_value by account, if defined.
 *  @table config_param - stores all available dynamically delivered app_config
 *  options and related default values.
 */
interface IAppConfig {
  account: Uint8Array;
  config_param: string;
  priority: number;
  param_value: string;
  value_type: "int" | "string" | "bin" | "date" | "bool";
  state: Uint8Array;
  create_time: Date;
  update_time: Date;
}

/**
 * Interface to the Blofin WSS push notification envelope.
 */
export type IResponseProps = {
  event: string;
  code: string;
  msg: string;
  action?: string;
  arg: {
    channel: string;
    instId: string;
  };
  data: any;
};

/**
 * Internal application state representing an active trading session.
 *
 * Data is hydrated from three primary sources:
 * 1. **Database View (`vw_accounts`)**: Provides master account details and pre-resolved options.
 * 2. **Environment (`.env`)**: Provides proprietary keys, secrets, and Blofin API endpoints via {@link IAccountConfig}.
 * 3. **Global Config**: Application-wide settings defined by `IAppConfig`.
 */
export interface ISession extends IUserConfig {
  /** Real-time connection status to the exchange */
  state: "disconnected" | "connected" | "connecting" | "error" | "closed";

  /** Resolved account details from vw_accounts and fixed broker properties */
  account: Uint8Array;
  margin_mode: "cross" | "isolated";
  hedging: boolean; /** Position mode: True for hedging, False for one-way */

  /** Global cursors and config params */
  audit_order: string; // DB cursor for the last order audited
  audit_stops: string; // DB cursor for the last stop-loss/take-profit audited
  config: Record<string, any>; // Dynamic config param bucket from IAccountConfig
}

/**
 * Proprietary credentials and endpoints parsed from the `.env.local.${environ}` file.
 * @see parseEnvAccounts
 */
export interface IAccountConfig {
  alias: string;
  api: string;
  secret: string;
  phrase: string;
  rest_api_url: string;
  private_wss_url: string;
  public_wss_url: string;
}

export interface IUserConfig extends IAccountConfig {
  user: Uint8Array;
  username: string;
  title: string;
  role: Uint8Array;
  isAdmin: () => boolean;
}

/** Main Registry: multi-tennant registry mapping every online enabled broker account > */
const _sessions = new Map<string, ISession>();

let _localSession: IMessage | null = null;

/**
 * @function Session
 * @description In a Multi-Papa scenario, we fetch the session by its account hex.
 */
// export const Session = (account?: Uint8Array): ISession | undefined => {
//   if (!account) return Array.from(_sessions.values())[0]; // Fallback for single-account legacy
//   return _sessions.get(hexString(account, 6));
// };

/**
 * @function Session
 * @description
 * - In Process Master: Returns the broker session from the Map.
 * - In Process Worker: Returns the instrument's "Boarding Pass" (IMessage).
 */
export const Session = <T = IMessage | ISession>(account?: Uint8Array): T => {
  // If we are a Worker , ignore the Map and return the local context
  if (cluster.isWorker && _localSession) return _localSession as T;

  // Otherwise, handle Master Registry logic
  if (!account) return Array.from(_sessions.values())[0] as T;
  return _sessions.get(hexString(account, 6)) as T;
};

/**
 * @function setSession
 * @description
 * - In Master: Updates the Registry for a specific account.
 * - In Worker: Updates the local Instrument state.
 */
export const setSession = (payload: Partial<IMessage | ISession>) => {
  if (cluster.isWorker) {
    // Worker logic: Cast to IMessage to satisfy the worker lifecycle states
    _localSession = { ...(_localSession || {}), ...payload } as IMessage;
    return;
  }

  // Papa logic: Ensure we have an account key before updating the Map
  const acct = payload.account || Session<ISession>()?.account;
  const key = acct ? hexString(acct, 6) : null;

  if (key) {
    const existing = _sessions.get(key) || ({} as ISession);
    _sessions.set(key, { ...existing, ...payload } as ISession);
  }
};

/**
 * A Higher-Order Function (HOF) that wraps core logic with an authorization gate.
 *
 * @description
 * This utility standardizes session validation across the application. It checks if a
 * valid session/account exists before executing the provided callback. If validation
 * fails, it short-circuits and returns a standardized 404/Unauthorized error response.
 *
 * @template T - The expected return type of the successful callback logic.
 *
 * @param context - A string identifier used for logging and error reporting (e.g., "Instrument.Import").
 * @param callback - The core logic to execute. Receives a guaranteed {@link ISession} object.
 * @param account - Optional {@link Uint8Array} account identifier for Master Registry lookups.
 *
 * @returns
 * Returns the result of the `callback` if authorized, otherwise returns a
 * standardized {@link IPublishResult} error array.
 *
 * @example
 * ```typescript
 * return withSession("User.Profile", (session) => {
 *   return fetchProfile(session.account);
 * });
 * ```
 */
/**
 * @template T - The specific interface (e.g., IInstrumentPosition)
 * being processed by the callback.
 */
export const withSession = async <T>(context: string, callback: SessionCallback<T>, account?: Uint8Array): Promise<T | Array<IPublishResult<any>>> => {
  // <--- The "Union" return
  const s = Session(account);

  if (!s?.account) {
    return [
      {
        key: undefined,
        response: createResponse(SC.INVALID_SESSION, context),
      },
    ];
  }

  return await callback(s as ISession);
};

/**
 * Parses account credentials from a JSON-formatted environment string.
 *
 * @param envVar - The raw string from `process.env.APP_ACCOUNT`.
 *
 * @remarks
 * The input must be a JSON-compliant array of objects.
 * If using a `.env` file, ensure the string is enclosed in backticks if it spans multiple lines.
 *
 * @example
 * ```bash
 * APP_ACCOUNT=`[
 *   {
 *     "alias": "Test",
 *     "api": "0123...",
 *     "secret": "abcd...",
 *     "phrase": "test_phrase",
 *     "rest_api_url": "https://openapi.blofin.com",
 *     "private_wss_url": "wss://openapi.blofin.com/ws/private",
 *     "public_wss_url": "wss://openapi.blofin.com/ws/public"
 *   }
 * ]`
 * ```
 *
 * @returns An array of session configurations. Returns an empty array if envVar is undefined.
 * @throws Fatal Logs to stderr and returns [] on JSON parse failure (Note: adjust code if you want it to actually exit).
 */
const parseEnvAccounts = (envVar: string | undefined, log: ILogger): IAccountConfig[] => {
  if (!envVar) {
    log.error("CRITICAL: APP_ACCOUNT missing.", SC.NULL_QUERY);
    process.exit(2);
  }

  try {
    const rawKeys = JSON.parse(envVar.trim().replace(/^`|`$/g, ""));
    const required: (keyof IAccountConfig)[] = ["alias", "api", "secret", "phrase", "rest_api_url", "private_wss_url", "public_wss_url"];

    return rawKeys.map((entry: any) => {
      for (const field of required) {
        if (!entry[field]) throw new Error(`Missing ${field} in account ${entry.alias || "unknown"}`);
      }
      return entry as IAccountConfig;
    });
  } catch (e) {
    log.error("Config Error:", SC.MALFORMED_WSS, e);
    process.exit(2);
  }
};

/**
 * Orchestrates the full hydration of an application session.
 *
 * This function synchronizes data from three distinct planes:
 * 1. **Identity**: Resolves `account` and margin preferences via `Account.Fetch`.
 * 2. **Security**: Cross-references database aliases against `APP_ACCOUNT` env keys to ensure parity.
 * 3. **Parameters**: Flattens vertical EAV-style database configs into a typed `config` object.
 *
 * @param props - Search criteria (usually `{ account: Uint8Array }`) to locate the master account.
 * @param symbol - The trading pair (e.g., 'BTC-USDT') to bind to this session state.
 *
 * @security Exits with code 1 if the account alias does not exist in the local environment,
 * preventing unauthorized execution even if the database is compromised.
 *
 * @throws {process.exit(1)} On database resolution failure or environment mismatch.
 */
export const Config = async (props: Partial<IAccount>, context = "Session.Config") => {
  /**
   * 1. Create a "Boot Logger"
   * We don't have a session yet, so we use a temporary placeholder
   * to satisfy the logger's need for an account/alias.
   */
  return withSystem(context, async () => {
    /** 2. Fetch Account Base */
    const config = (await Account.Fetch(props)) ?? [];
    const [{ account, alias, margin_mode, hedging }] = config;

    if (!config.length || !account || !alias || !margin_mode || !hedging) {
      log.error("Unauthorized or invalid credentials.", SC.INVALID_SESSION);
      process.exit(1);
    }

    /** 3. Validate Environment (Pass the log tool into the parser) */
    const sessionKeys = parseEnvAccounts(process.env.APP_ACCOUNT, log);
    const sessionKey = sessionKeys.find((k) => k.alias === alias);

    if (!sessionKey) {
      log.error(`Alias '${alias}' not found in APP_ACCOUNT environment.`, SC.NOT_FOUND);
      process.exit(1);
    }

    /** 4. Hydrate App Config from DB */
    const appConfig = await Select<IAppConfig>({ account }, { table: "vw_app_config" }, context);

    const mergedConfig = (appConfig.data ?? []).reduce(
      (acc, row) => {
        let val: any = row.param_value;
        if (row.value_type === "int") val = parseInt(val, 10);
        else if (row.value_type === "bool") val = val === "true" || val === "1";
        acc[row.config_param] = val;
        return acc;
      },
      {} as Record<string, any>,
    );

    /** 5. Finalize and Globalize Session */
    const finalizedSession: ISession = {
      ...Session(),
      account,
      ...sessionKey,
      margin_mode,
      hedging,
      state: "disconnected",
      audit_order: "0",
      audit_stops: "0",
      config: mergedConfig,
    };

    setSession(finalizedSession);

    // Now that the session is set, we can log a real success with the correct Alias
    log.success(`${alias} initialized and session locked.`, SC.OK);
  });
};
/**
 * Generates an HMAC-SHA256 signature for authenticated REST API requests.
 *
 * Follows the Blofin specific pre-hash format: `path + method + timestamp + nonce + body`.
 *
 * @param {string} method - HTTP method (GET, POST, etc.).
 * @param {string} path - The specific API endpoint path.
 * @param {string} [body=""] - The stringified JSON payload (if any).
 *
 * @returns {Promise<{ sign: string, timestamp: string, nonce: string }>}
 * The Base64 encoded signature and associated metadata.
 */
export const signRequest = async (method: string, path: string, body: string = "") => {
  const secret = Session()?.secret;
  const timestamp = String(Date.now());
  const nonce = uniqueKey(32);
  const prehash = `${path}${method}${timestamp}${nonce}${body}`;
  const messageEncoded = new TextEncoder().encode(prehash);
  const hmac = createHmac("sha256", secret!).update(messageEncoded).digest("hex");
  const hexEncoded = Buffer.from(hmac).toString("hex");
  const sign = Buffer.from(hexEncoded, "hex").toString("base64");

  return { sign, timestamp, nonce };
};

/**
 * Generates the specific HMAC-SHA256 signature required for WSS Login.
 *
 * @param {string} key - The API Secret key used for signing.
 * @returns {Promise<{ sign: string, timestamp: string, nonce: string }>}
 */
export const signLogon = async (key: string) => {
  const timestamp = String(Date.now());
  const nonce = uniqueKey(32);
  const method = "GET";
  const path = "/users/self/verify";
  const prehash = `${path}${method}${timestamp}${nonce}`;
  const messageEncoded = new TextEncoder().encode(prehash);
  const hmac = createHmac("sha256", key).update(messageEncoded).digest("hex");
  const hexEncoded = Buffer.from(hmac).toString("hex");
  const sign = Buffer.from(hexEncoded, "hex").toString("base64");

  return { sign, timestamp, nonce };
};

/**
 * @function openWebSocket
 * @description Initiates the native Node 22 WebSocket lifecycle for the exchange feed.
 * This function serves as the central data ingress point, routing exchange-pushed
 * updates to the relevant system publishers (Accounts, Orders, Positions).
 *
 * @returns {WebSocket} The active native WebSocket instance for the session.
 *
 * @example
 * // Handshake sequence:
 * // 1. Connection established -> Trigger 'login' op with HMAC signature.
 * // 2. Login success -> Subscribe to 'account', 'positions', and 'orders' channels.
 * // 3. Heartbeat -> On 'pong' receipt, trigger trade execution logic.
 */
export const openWebSocket = (passport: ISession) => {
  const context = "WSS.Private";
  const { account, alias, api, secret, phrase, rest_api_url, private_wss_url, public_wss_url } = passport;
  const log = SystemLogger(context);
  const ws = new WebSocket(private_wss_url!);

  setSession({ account, state: "connecting", audit_order: "0", audit_stops: "0", api, secret, phrase, rest_api_url, private_wss_url, public_wss_url });

  ws.onopen = () => {
    log.info(`Connecting to ${private_wss_url}...`);
    const login = async () => {
      const { sign, timestamp, nonce } = await signLogon(secret!);
      ws.send(
        JSON.stringify({
          op: "login",
          args: [{ apiKey: api, passphrase: phrase, timestamp, sign, nonce }],
        }),
      );
    };

    login();
  };

  ws.onclose = () => {
    // Use the current session to ensure we don't wipe out credentials
    setSession({ ...Session(), state: "closed" });
    log.warn(`${alias}: Connection closed`, SC.PARTIAL_SYNC);
  };

  ws.onerror = (error) => {
    setSession({ state: "error" });
    log.error(`Socket hardware/network error`, SC.MALFORMED_WSS, error);
  };

  ws.onmessage = async (event) => {
    const message = parseJSON<IResponseProps>(event.data);
    if (!message) return;

    switch (message.event) {
      case "login":
        if (message.code === "0") {
          ws.send(
            JSON.stringify({
              op: "subscribe",
              args: [{ channel: "account" }, { channel: "positions" }, { channel: "orders" }],
            }),
          );
          // Log local process info for debugging PID-specific issues
          log.success(`Auth Success | PID: ${process.pid} | URL: ${ws.url}`, SC.OK);
        } else {
          setSession({ ...Session(), state: "error" });
          log.error(`Exchange Login Denied`, SC.INVALID_SESSION, message);
        }
        break;

      case "subscribe":
        setSession({ ...Session(), state: "connected" });
        break;

      case "error":
        log.error(`Exchange Reported Error`, SC.MALFORMED_WSS, message);
        break;

      default:
        // Handle incoming WSS channel updates
        if (message.arg?.channel) {
          const { channel } = message.arg;
          channel === "account" && Accounts.Publish(message.data);
          channel === "orders" && Orders.Publish("WSS", message.data);
          channel === "positions" && Positions.Publish(message.data);
        }
    }
  };

  return ws;
};
