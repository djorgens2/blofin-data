/**
 * @module Session
 * @description Core session management and authentication for the Blofin Trading Engine.
 * Handles environment-based configuration, vertical parameter hydration,
 * and HMAC-SHA256 signature generation for REST/WSS requests.
 */

"use strict";

import type { IAccount } from "#db/interfaces/account";
import type { IMessage } from "#lib/ipc.util";

import { hexString, parseJSON } from "#lib/std.util";
import { uniqueKey } from "#lib/crypto.util";
import { createHmac } from "node:crypto";
import { TextEncoder } from "node:util";
import { Positions, Accounts, Orders } from "#api";
import { Select, Account } from "#db";
import { Log } from "#lib/log.util";

import cluster from "node:cluster";

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
export interface ISession extends IAccountConfig {
  /** Real-time connection status to the exchange */
  state: "disconnected" | "connected" | "connecting" | "error" | "closed";

  /** Resolved account details from vw_accounts and fixed broker properties */
  account: Uint8Array;
  alias: string;
  margin_mode: "cross" | "isolated";
  hedging: boolean; /** Position mode: True for hedging, False for one-way */
  
  /** Api Keys and broker Api/Wss end-point Urls */
  api: string;
  secret: string;
  phrase: string;
  rest_api_url: string;
  private_wss_url: string;
  public_wss_url: string;

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

/** Main Registry: multi-tennant registry mapping every online enabled broker account > */
const _sessions = new Map<string, ISession>();

let _localSession: IMessage | null = null

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
 * - In Papa: Returns the broker session from the Map.
 * - In Mama: Returns the instrument's "Boarding Pass" (IMessage).
 */
export const Session = <T = IMessage | ISession>(account?: Uint8Array): T => {
  // If we are a Worker (Mama), ignore the Map and return the local context
  if (cluster.isWorker && _localSession) return _localSession as T;

  // Otherwise, handle Papa's Registry logic
  if (!account) return Array.from(_sessions.values())[0] as T;
  return _sessions.get(hexString(account, 6)) as T;
};

/**
 * @function setSession
 * @description Registers or updates an account passport.
 */
// export const setSession = (payload: Partial<ISession>) => {
//   const key = hexString(payload.account!, 6);
//   if (key) {
//     const existing = _sessions.get(key) || ({} as ISession);
//     _sessions.set(key, { ...existing, ...payload } as ISession);
//   }
// };

/**
 * @function setSession
 * @description 
 * - In Papa: Updates the Registry for a specific account.
 * - In Mama: Updates the local Instrument state.
 */
export const setSession = (payload: Partial<IMessage | ISession>) => {
  if (cluster.isWorker) {
    // Mama logic: Cast to IMessage to satisfy the worker lifecycle states
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
const parseEnvAccounts = (envVar: string | undefined): IAccountConfig[] => {
  if (!envVar) {
    Log().error("CRITICAL: APP_ACCOUNT missing.");
    process.exit(2);
  }

  try {
    const sanitized = envVar.trim().replace(/^`|`$/g, "");
    const rawArray = JSON.parse(sanitized);

    // Validation for the external fields only
    return rawArray.map((entry: any) => {
      const required: (keyof IAccountConfig)[] = ["alias", "api", "secret", "phrase", "rest_api_url", "private_wss_url", "public_wss_url"];

      for (const field of required) {
        if (!entry[field]) throw new Error(`Missing ${field} in account ${entry.alias || "unknown"}`);
      }
      return entry as IAccountConfig;
    });
  } catch (e) {
    Log().error("Config Error:", e instanceof Error ? e.message : e);
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
  const accountConfig = await Account.Fetch(props);

  if (!accountConfig || accountConfig.length === 0) {
    Log().error(`[Error] ${context}: Account not found in Database.`);
    process.exit(1);
  }

  const [{ account, alias, margin_mode, hedging }] = accountConfig;

  // 1. Validate Environment Parity immediately
  const sessionKeys = parseEnvAccounts(process.env.APP_ACCOUNT);
  const sessionKey = sessionKeys.find((key) => key.alias === alias);

  if (!sessionKey) {
    Log().error(`[Error] ${context}: Alias '${alias}' found in DB but missing from .env.`);
    process.exit(1);
  }

  // 2. Hydrate App Config from DB
  const appConfig = await Select<IAppConfig>({ account }, { table: "vw_app_config" }, "Session.Config");

  let mergedConfig: Record<string, any> = {};
  if (appConfig.success && appConfig.data) {
    mergedConfig = appConfig.data.reduce(
      (acc, row) => {
        let val: any = row.param_value;
        if (row.value_type === "int") val = parseInt(val, 10);
        else if (row.value_type === "bool") val = val === "true" || val === "1";

        acc[row.config_param] = val;
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  // 3. Finalize Session
  setSession({
    account,
    ...sessionKey, // Guaranteed to be defined now
    margin_mode,
    hedging,
    state: "disconnected",
    audit_order: "0",
    audit_stops: "0",
    config: mergedConfig,
  });

  console.log(`[Info] ${context}: ${alias}} initialized.`);
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
  const { account, alias, api, secret, phrase, rest_api_url, private_wss_url, public_wss_url } = passport;
  const ws = new WebSocket(private_wss_url!);

  setSession({ account, state: "connecting", audit_order: "0", audit_stops: "0", api, secret, phrase, rest_api_url, private_wss_url, public_wss_url });

  ws.onopen = () => {
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
    console.warn(`[WSS] Connection closed for account: ${alias}`);
  };

  ws.onerror = (error) => {
    setSession({ state: "error" });
    Log().error("WebSocket error:", error);
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
          console.log(`[WSS] Auth Success | PID: ${process.pid} | URL: ${ws.url}`);
        } else {
          setSession({ ...Session(), state: "error" });
        }
        break;

      case "subscribe":
        setSession({ ...Session(), state: "connected" });
        break;

      case "error":
        Log().error("[WSS] Exchange reported error:", message);
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

