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

let currentHeader = "";
export const setHeader = (heading?: string, status?: { prod: boolean; demo: boolean }) => {
  const _user = UserToken();
  const boxWidth = 132;
  
  currentHeader = heading ? heading : currentHeader;

  // 1. Prepare the Status Indicators (Right Aligned)
  let rightMarginStatus = "";
  if (_user.isAdmin() && status) {
    const pStatus = status.prod ? green("[ ONLINE ]") : red("[ OFFLINE ]");
    const dStatus = status.demo ? green("[ ONLINE ]") : red("[ OFFLINE ]");
    rightMarginStatus = `Prod: ${pStatus}  Demo: ${dStatus}   `;
  }

  // 1. Center the Heading
  const content = `**** ${currentHeader} ****`;
  const vLen = visibleLength(content);
  const padLeft = " ".repeat(Math.floor((boxWidth - vLen) / 2));

  console.clear();
  console.log(`┌${"─".repeat(boxWidth)}┐`);

  // Header Row
  const mainHeader = padLine(cyan(content), boxWidth, padLeft);
  console.log(mainHeader);

  // Row 2: Right-aligned Status (One line below heading or same line if preferred)
  if (rightMarginStatus) {
    const sLen = visibleLength(rightMarginStatus);
    const sPad = " ".repeat(boxWidth - sLen); // -2 for borders
    console.log(`│${sPad}${rightMarginStatus}│`);
  } else {
    console.log(`│${" ".repeat(boxWidth)}│`);
  }

  // Data Rows (Using padLine for guaranteed alignment)
  console.log(padLine(`${bold("Log Time:")} ${dim(new Date().toLocaleString())}`, boxWidth, "    "));

  if (_user.username.length > 0) {
    console.log(padLine(`User: ${green(_user.username)}`, boxWidth, "        "));
  }

  if (_user.title.length > 0) {
    console.log(padLine(`Role: ${green(_user.title)}`, boxWidth, "        "));
  }

  // 2. Status Label Logic
  const statusLabel =
    _user.error === 0
      ? green("    Success: ")
      : _user.error < 200
        ? cyan("  Confirmed: ")
        : _user.error < 300
          ? yellow("*** Warning: ")
          : _user.error < 499
            ? red("    *** Error: ")
            : "             ";

  console.log(`│${" ".repeat(boxWidth)}│`);
  // console.log( statusLabel, _user );

  // Status Row
  console.log(padLine(`${statusLabel}${_user.message}`, boxWidth));

  console.log(`│${" ".repeat(boxWidth)}│`);
  console.log(`└${"─".repeat(boxWidth)}┘`);
  console.log(``);
};
