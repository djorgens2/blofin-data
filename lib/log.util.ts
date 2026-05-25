/** Nice to have
 * Log().success(`-> [Chart] Rendered ${chartData.length} candles to ${fileName}`);
 *
 */

import type { ISession } from "#app/session";
import type { IPublishResult } from "#api";

import { Session } from "#app/session";
import { hexString } from "#lib/std.util";
import { SC } from "#api/lexicon";

import UserToken from "#cli/interfaces/user";
import fs from "fs";
import type { IMessage } from "./ipc.util";

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
}

/**
 * @interface ILogger
 * A leaner, primed logging interface passed into callbacks.
 */
export interface ILogger {
  success: (message: string, code?: number) => void;
  warn: (message: string, code?: number) => void;
  error: (message: string, code?: number, error?: any) => void;
  info: (message: string) => void;
  admin: <T>(callback: () => T) => T | undefined;
  flags: typeof DEFAULT_LOGGING;
}

const DEFAULT_LOGGING = { select: false, update: false, insert: false, delete: false, account: false, errors: false, ok: false };

export const getEnvFlags = (): ILogConfig => {
  // 1. Parse Environmental Flags
  let envFlags: ILogConfig = DEFAULT_LOGGING;
  try {
    if (process.env.APP_LOGGING) {
      envFlags = { ...DEFAULT_LOGGING, ...JSON.parse(process.env.APP_LOGGING) };
    }
  } catch (e) {
    console.error("-> [Error] LogConfig: Malformed APP_LOGGING JSON in .env");
  }
  return envFlags;
};

const internalLogger = (session: ISession | IMessage, context: string, flags: typeof DEFAULT_LOGGING): ILogger => {
  const accountHex = hexString(session.account!, 6);

  return {
    flags,

    success: (msg, code = SC.OK) => {
      // 🚩 Filtered by .env "ok" flag
      if (!flags.ok && code > 299) return;

      console.log(`\x1b[32m[Success]\x1b[0m \x1b[36m${context}\x1b[0m [${accountHex}]: ${msg}`);
    },

    error: (msg, code = SC.OK, err) => {
      // 🚩 Filtered by .env "errors" flag
      if (!flags.errors && code < 300) return;

      console.error(`\x1b[31m[Error]\x1b[0m \x1b[36m${context}\x1b[0m [${accountHex}]: ${msg}`, err || "");
    },

    warn: (msg, code = SC.OK) => {
      // 🚩 Filtered by .env "errors" flag
      if (!flags.errors && !(code > 0 && code < 300)) return;

      console.error(`\x1b[31m[Error]\x1b[0m \x1b[36m${context}\x1b[0m [${accountHex}]: ${msg}`);
    },

    // Info is usually always printed for "Audit.Trace" purposes
    info: (msg) => console.log(`\x1b[34m[Info]\x1b[0m ${context}: ${msg}`),

    admin: <T>(cb: () => T): T | undefined => {
      const isAdmin = UserToken().isAdmin();
      if (!isAdmin) {
        if (flags.errors) console.warn(`\x1b[33m[Security]\x1b[0m Unauthorized Admin attempt: ${context}`);
        return undefined;
      }
      return cb();
    },
  };
};

/**
 * @function routeLogs
 * @description
 * Redirects console to file. Strips ANSI color codes and formats
 * multi-line output for "Whistle-Clean" readability.
*/
export const routeLogs = (context: string) => {
  const logPath = `./logs/${context.replace(/\s+/g, "_")}.log`;
  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  // Regex to strip ANSI color codes (the [32m stuff)
  const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

  const writeFormatted = (prefix: string, chunk: any) => {
    const timestamp = new Date().toISOString();
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

// logging.ts
export const withLog = async <T = void>(
  context: string,
  callback: (log: ILogger, session: ISession) => Promise<T> | T
): Promise<T | Array<IPublishResult<any>>> => {
  
  // 1. Get whatever "Pod" data we have so far (System, User, or Full Account)
  const session = Session(); 

  // 2. Build the tool using that data
  const log = internalLogger(session, context, getEnvFlags());

  // 3. Run the logic
  try {
    return await callback(log, session as ISession);
  } catch (err) {
    log.error("Unhandled Exception", SC.UPSERT_FAIL, err);
    throw err;
  }
};

/**
 * Higher-Order Function to provide a session-aware, authenticated logger.
 */
// export const withLog = async <T>(context: string, callback: (log: ILogger, session: ISession) => Promise<T> | T): Promise<T | Array<IPublishResult<any>>> => {
//   // 1. Get Environmental Flags (Parsed once here)
//   const envFlags = getEnvFlags();

//   return withSession<T>(context, async (session) => {
//     // 2. Prime the logger with session AND flags
//     const log = internalLogger(session, context, envFlags);

//     return await callback(log, session);
//   });
// };

/**
 * A System-level HOF for boot/engine logic where no User Session exists yet.
 */
export const withSystem = async <T>(
  context: string,
  callback: (log: ILogger) => Promise<T> | T
): Promise<T> => {
  // We create the logger INTERNALLY so it stays private
  const bootSession = { account: new Uint8Array(), alias: "SYSTEM" } as ISession;
  const log = internalLogger(bootSession, context, getEnvFlags());
  
  return await callback(log);
};

/**
 * Exported factory for System-level logging only.
 */
export const SystemLogger = (context: string): ILogger => {
  const bootSession = { account: new Uint8Array(), alias: "SYSTEM" } as ISession;
  return internalLogger(bootSession, context, getEnvFlags());
};

/** 
 * COMPATIBILITY SHIM: 
 * Temporary helper to prevent 171 build errors. 
 * Redirects legacy Log() calls to the new system-level logger.
 */
export const Log = (account?: Uint8Array) => {
  // Use a 'System' context for legacy logs until they are refactored
  const session = { account: account || new Uint8Array(), alias: "LEGACY" } as ISession;
  const flags = getEnvFlags(); // Your existing flag parser
  
  // Return an object that matches your OLD Log() interface
  return internalLogger(session, "Legacy.Sync", flags);
};

