/** Nice to have
 * Log().success(`-> [Chart] Rendered ${chartData.length} candles to ${fileName}`);
 *
 */

import { hexString } from "#lib/std.util";
import { Session } from "#app/session";

import UserToken from "#cli/interfaces/user";
import fs from "fs";

/**
 * @interface ILogConfig
 */
interface ILogConfig {
  // Environmental Toggles (from APP_LOGGING JSON)
  select: boolean;
  update: boolean;
  insert: boolean;
  delete: boolean;
  account: boolean;
  errors: boolean;
  ok: boolean;

  // Identity Methods
  session: (context?: string) => void;
  error: (message: string, error?: any) => void;
  success: (message: string, context?: string) => void;
}

const DEFAULT_LOGGING = { select: false, update: false, insert: false, delete: false, account: false, errors: false, ok: false };

/**
 * @function routeLogs
 * @description
 * Redirects console to file. Strips ANSI color codes and formats
 * multi-line output for "Whistle-Clean" readability.
 */
export const routeLogs = (alias: string) => {
  const logPath = `./logs/${alias.replace(/\s+/g, "_")}.audit.log`;
  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  // Regex to strip ANSI color codes (the [32m stuff)
  const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

  const writeFormatted = (prefix: string, chunk: any) => {
    const timestamp = new Date().toISOString();
    // Convert chunk to string, strip colors, and trim trailing newlines
    const cleanChunk = stripAnsi(String(chunk)).trim();

    if (!cleanChunk) return; // Skip empty pulses

    // If it's a multi-line object, indent it for beauty
    const formatted = cleanChunk.includes("\n")
      ? `\n${cleanChunk
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")}`
      : ` ${cleanChunk}`;

    logStream.write(`[${timestamp}] ${prefix}:${formatted}\n`);
  };

  // Override the low-level process writes
  process.stdout.write = (chunk: any) => {
    writeFormatted("STDOUT", chunk);
    return true;
  };

  process.stderr.write = (chunk: any) => {
    writeFormatted("STDERR", chunk);
    return true;
  };

  console.log(`[Security] Console routed to persistent log: ${logPath}`);
};

/**
 * @function Log
 * @description
 * Multi-mode logger.
 *
 * Combined flags from .env and methods for identity-driven logging.
 * 1. Log().select -> returns boolean flag from .env
 * 2. Log(account).session() -> outputs redacted/full session to console
 * 3. Log(account).error() -> outputs redacted/full session to console
 *
 * Flags for DML transactions; logs all prepared SQL Statements and args
 *    ex: if (Log().select) {console.log("-> [Info] Executing Select on table...")}
 *
 * Inside a Mama Fork or Papa loop:
 *    ex: Log(account).session("Pre-Flight Check");
 *
 * In the catch block:
 *    ex: try {
 *        } catch (e) {
 *          Log(Session().account).error("Fractal Boundary Breach", e);
 *        }
 */
export const Log = (account?: Uint8Array): ILogConfig => {
  // 1. Parse Environmental Flags
  let envFlags = DEFAULT_LOGGING;
  try {
    if (process.env.APP_LOGGING) {
      envFlags = { ...DEFAULT_LOGGING, ...JSON.parse(process.env.APP_LOGGING) };
    }
  } catch (e) {
    console.error("-> [Error] LogConfig: Malformed APP_LOGGING JSON in .env");
  }

  // 2. Resolve Session & Authority
  const _session = Session(account);
  const isAdmin = UserToken().isAdmin();

  return {
    ...envFlags,

    /**
     * Outputs session state to stdout/stderr.
     * Escalates to sensitive credentials only if UserToken is 'Admin'.
     */
    session: (context = "Audit.Trace") => {
      if (!_session?.account) return; // Silent if no session

      const output: any = {
        alias: _session?.alias,
        // symbol: s?.symbol,
        // state: s?.state,
        config: _session?.config,
        audit: { order: _session?.audit_order, stops: _session?.audit_stops },
      };

      // Credential escalation (Admin Only)
      if (isAdmin) {
        output.credentials = {
          api: _session?.api,
          secret: _session?.secret ? _session?.secret.slice(0, 4) + "..." : "none",
          phrase: _session?.phrase ? "****" : "none",
        };
      }

      console.log(`\n--- ${context} [${hexString(_session?.account, 6)}] ---`);
      console.dir(output, { depth: null, colors: true });
      console.log(`------------------------------------------\n`);
    },

    error: (message: string, error?: any) => {
      envFlags.errors && console.error(`[Error] ${hexString(account!, 6) || "System"}: ${message}`, error || "");
    },

    success: (message: string, context?: string) => {
      envFlags.ok && console.log(`[Success] ${context ? context + `: ` : ``}${hexString(account!, 6) || "System"}: ${message}` || "");
    },
  };
};
