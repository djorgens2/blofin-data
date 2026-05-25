"use strict"

import * as readline from "node:readline";
import * as sysInfo from "systeminformation";

/**
 * Listens for a keypress and resolves only if it's in the allowed set.
 * @param allowedKeys - Array of key names (e.g., ['up', 'down', 'return'])
 */
export const keypress = async (allowedKeys: string[]): Promise<string> => {
  // Setup stream
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve) => {
    const onKeypress = (chunk: any, key: readline.Key) => {
      // Always allow Ctrl+C to exit
      if (key.ctrl && key.name === "c") resolve("ctrl-c");
      console.log(key);

      if (allowedKeys.includes(key.name || "")) {
        // Cleanup: Stop listening and reset terminal mode
        process.stdin.removeListener("keypress", onKeypress);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.pause();

        resolve(key.name!);
      }
    };

    process.stdin.on("keypress", onKeypress);
  });
}