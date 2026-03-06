import type { TResponse } from "#api/types";
import type { ISession } from "#app/session";

import { hexify } from "#lib/crypto.util";
import { Session } from "#app/session";

/**
 * PLANE 2: THE BOARDING PASS (IMessage)
 * Task-specific Context for a Dedicated Fork.
 */
export interface IMessage extends Omit<Partial<ISession>, "state"> {
  state: "init" | "api" | "update" | "ready" | "shutdown" | "complete" | "error";

// export interface IMessage extends Partial<ISession> {
//   state: "init" | "api" | "update" | "ready" | "shutdown" | "complete" | "error";

  // -- Identity (The "Who") --
  instrument: Uint8Array; // Instrument PK (e.g., from 'BTC-USDT')
  period: Uint8Array; // Period PK (e.g., from '1m')

  // -- Human Readables (The "Label") --
  symbol: string;
  timeframe: string;
  position: string;

  // -- Lifecycle & Audit --
  timestamp: number;
  audit?: Record<string, TResponse>;
  status: {
    success: boolean;
    code: number;
    text?: string;
    attempt?: number;
    fatal?: boolean;
  };
}

/**
 * @function IpcHeader
 * @description The Gatekeeper. Converts a heavy Session into a lean Instrument Message.
 * Merges Session (Passport) and Task (Boarding Pass).
 * Ruthlessly re-hexifies all binary keys to prevent IPC flattening.
 */
/**
 * @function IpcHeader
 */
export const IpcHeader = (task: Partial<IMessage>, state: IMessage["state"] = "init"): IMessage => {
  // 1. Resolve Global Passport (If Papa is calling this from his Registry)
  // Note: Session() here returns the 'Master' version in Papa's process
  const passport = Session<ISession>() || ({} as Partial<ISession>);

  // 2. THE PURGE: We explicitly construct a new object with ONLY what Mama needs.
  // Anything not in this return statement is "Garbage Collected" (Ignored).
  return {
    state,
    timestamp: Date.now(),

    // -- IDENTITY (The 'Who') --
    account: hexify(task.account || passport.account!) || new Uint8Array(),
    instrument: hexify(task.instrument!) || new Uint8Array(),
    period: hexify(task.period!) || new Uint8Array(),

    // -- LABELS --
    symbol: task.symbol || "",
    timeframe: task.timeframe || "",
    position: task.position || "",

    // -- LEAN CREDENTIALS (Mama only needs these to talk to the Exchange) --
    api: task.api || passport.api || "",
    secret: task.secret || passport.secret || "",
    phrase: task.phrase || passport.phrase || "",
    rest_api_url: task.rest_api_url || passport.rest_api_url || "",
    
    // -- CONFIG (Deep merge settings) --
    config: { ...passport.config, ...task.config },

    // -- FEEDBACK --
    status: {
      success: task.status?.success ?? true,
      code: task.status?.code ?? 200,
      text: task.status?.text || "",
    },
  };
};

