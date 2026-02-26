/**
 * @module CLI-Header
 * @description Renders a mathematically perfect ASCII dashboard frame.
 */

import { red, green, cyan, yellow, bold, dim } from "console-log-colors";
import UserToken from "#cli/interfaces/user";

const visibleLength = (str: string): number => {
  return str.replace(/\u001b\[[0-9;]*m/g, "").length;
};

/**
 * Ensures a line of text is perfectly padded to fit inside the box borders.
 * @param text - The (potentially colored) string to pad.
 * @param width - The target width (132).
 * @param indent - Optional left-hand indentation string.
 */
const padLine = (text: string, width: number, indent: string = "") => {
  const vLen = visibleLength(text) + visibleLength(indent);
  const padding = " ".repeat(Math.max(0, width - vLen));
  return `│${indent}${text}${padding}│`;
};

export const setHeader = (heading: string) => {
  const { username, title, error, message } = UserToken();
  const boxWidth = 132;
  
  // 1. Center the Heading
  const content = `**** ${heading} ****`;
  const vLen = visibleLength(content);
  const padLeft = " ".repeat(Math.floor((boxWidth - vLen) / 2));
  const centeredHeading = padLine(cyan(content), boxWidth, padLeft);

  // 2. Status Label Logic
  const statusLabel = 
    error === 0 ? green("    Success: ") :
    error < 200 ? cyan("  Confirmed: ") :
    error < 300 ? yellow("*** Warning: ") :
    error < 400 ? red("    *** Error: ") : "             ";

  console.clear();
  console.log(`┌${"─".repeat(boxWidth)}┐`);
  console.log(`│${" ".repeat(boxWidth)}│`);
  
  // Header Row
  console.log(centeredHeading);
  
  console.log(`│${" ".repeat(boxWidth)}│`);

  // Data Rows (Using padLine for guaranteed alignment)
  console.log(padLine(`${bold("Log Time:")} ${dim(new Date().toLocaleString())}`, boxWidth, "    "));
  
  if (username.length > 0) {
    console.log(padLine(`User: ${green(username)}`, boxWidth, "        "));
  }

  if (title.length > 0) {
    console.log(padLine(`Role: ${green(title)}`, boxWidth, "        "));
  }

  console.log(`│${" ".repeat(boxWidth)}│`);
  
  // Status Row
  console.log(padLine(`${statusLabel}${message}`, boxWidth));
  
  console.log(`│${" ".repeat(boxWidth)}│`);
  console.log(`└${"─".repeat(boxWidth)}┘`);
  console.log(``);
};
