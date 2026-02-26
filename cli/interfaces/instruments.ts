/**
 * @module Instrument-Controller
 * @description Search and selection logic for Database-driven Instruments.
 */

"use strict";

import type { IInstrumentPosition } from "#db/interfaces/instrument_position";
import type { ITableConfig } from "#cli/modules/Renderer";

import { red, cyan, gray, bold } from "console-log-colors";
import { setHeader } from "#cli/modules/Header";
import { renderTable } from "#cli/modules/Renderer";
import Prompt from "#cli/modules/Prompts";
import prompts from "prompts";

import * as InstrumentPosition from "#db/interfaces/instrument_position";
import * as Accounts from "#db/interfaces/account";
import * as db from "#db/query.utils";

/**
 * Step 1: Select Account (Autocomplete)
 * Filters the account list if you have many (Dev, Test, Prod, etc.)
 */
export const accountSelect = async (): Promise<string | undefined> => {
  const accounts = await Accounts.Fetch({});
  if (!accounts) return undefined;

  const { alias } = await prompts({
    type: "autocomplete",
    name: "alias",
    message: "  Select Account:",
    choices: accounts.map(acc => ({
      title: `${acc.status === "Enabled" ? "🔹" : "🔸"} ${acc.alias} ${gray(`(${acc.environ})`)}`,
      value: acc.alias
    })),
    suggest: (input, choices) => 
      Promise.resolve(choices.filter(i => i.title.toLowerCase().includes(input.toLowerCase())))
  });

  return alias;
};

/**
 * Step 2: Search Symbol (Autocomplete)
 * Solves the "too long" list problem via fuzzy-search.
 */
export const symbolSearch = async (alias: string): Promise<string | undefined> => {
  setHeader(`Account: ${bold(cyan(alias))} | Search Instruments`);

  const authorized = await db.Distinct<IInstrumentPosition>(
    // Ensure these fields are explicitly requested so they aren't 'undefined'
    { alias, symbol: undefined, environ: undefined, status: undefined }, 
    { table: `vw_instrument_positions`, keys: [[`alias`]], suffix: `ORDER BY SYMBOL` },
  );

  if (!authorized.success || !authorized.data) return undefined;

  // Define fixed widths for the search list 'columns'
  const symbolWidth = 16;
  const envWidth = 14;

  const { symbol } = await prompts({
    type: "autocomplete",
    name: "symbol",
    message: "  Search Symbol:",
    limit: 12,
    choices: authorized.data.map((i) => {
      const sym = (i.symbol || "").padEnd(symbolWidth);
      const env = `(${i.environ || "N/A"})`.padEnd(envWidth);
      const stat = i.status === "Open" ? cyan("Active") : red("Closed");

      return {
        // This creates the 'Visual Grid' inside the search bar
        title: `${sym} ${gray(env)} ${stat}`,
        value: i.symbol,
      };
    }),
    suggest: (input, choices) => 
      Promise.resolve(choices.filter(i => i.title.toLowerCase().includes(input.toLowerCase())))
  });

  return symbol;
};

/**
 * Step 3: View (The "Paint the Screen" Logic)
 * Aggregates selections and renders the final grid.
 */
export const View = async () => {
  setHeader("Instruments by Account");

  // 1. Pick Account
  const alias = await accountSelect();
  if (!alias) return; 

  // 2. Search Symbol
  const symbol = await symbolSearch(alias);
  if (!symbol) return; 

  // 3. Render Detail Table
  setHeader(`Instrument Detail: ${symbol}`);
  const positions = await InstrumentPosition.Fetch({ alias, symbol });

  if (positions) {
    const schema: ITableConfig<IInstrumentPosition>[] = [
      { key: "alias", label: "Account" },
      { key: "environ", label: "Env" },
      { key: "symbol", label: "Symbol" },
      { key: "position", label: "Position", align: "right" }
    ];

    renderTable(positions as any[], schema, { margin: 4, gutter: 5 });
  }

  // UX: Pause so the table is readable
  await Prompt(["choice"], { message: " ", active: "Search Again", inactive: "Finished" });
};
