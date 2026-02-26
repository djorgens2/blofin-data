/**
 * @module Administrative-Menu-Router
 * @description Core navigation and command orchestration for the Command Bridge.
 * 
 * Implements a Recursive Menu Pattern with an Action-Router to 
 * map database-driven privileges to TypeScript execution paths.
 * 
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import Prompt, { type IOption } from "#cli/modules/Prompts";
import { setHeader } from "#cli/modules/Header";
import { setMenu } from "#cli/modules/Menu";
import { isEqual } from "#lib/std.util";

// Interface Imports
import { menuCreateUser, menuEditUser, menuViewUser, menuDropUser } from "#cli/interfaces/user";
import { menuCreateAccount, menuEditAccount, menuDropAccount } from "#cli/interfaces/account";
import * as Account from "#cli/interfaces/account";
import * as Instrument from "#cli/interfaces/instruments";

/**
 * Dispatches to the appropriate View Page based on subject area.
 * @param area - The database subject (e.g., "Users", "Accounts").
 */
export const menuView = async (area: string) => {
  switch (area) {
    case "Users": await menuViewUser(); break;
    case "Accounts": await Account.View(); break;
    case "Instruments": await Instrument.View(); break;
    default: console.log(`${area} view not enabled.`);
  }
};

/**
 * Dispatches to the appropriate Editor Page based on subject area.
 * @param area - The database subject (e.g., "Users").
 */
export const menuEdit = async (area: string) => {
  switch (area) {
    case "Users": await menuEditUser(); break;
    default: console.log(`${area} editor not enabled.`);
  }
};

/**
 * Dispatches to the appropriate Creation Dialogue based on subject area.
 * @param area - The database subject (e.g., "Users", "Accounts").
 */
export const menuCreate = async (area: string) => {
  switch (area) {
    case "Users": await menuCreateUser(); break;
    case "Accounts": await menuCreateAccount(); break;
    default: console.log(`${area} creation not enabled.`);
  }
};

/**
 * Dispatches to the appropriate Deletion/Drop logic based on subject area.
 * @param area - The database subject (e.g., "Users").
 */
export const menuDrop = async (area: string) => {
  switch (area) {
    case "Users": await menuDropUser(); break;
    default: console.log(`${area} removal not enabled.`);
  }
};

/**
 * Placeholder for System Configuration logic.
 * @param area - The target configuration vertical.
 */
export const menuConfigure = async (area: string) => {
  switch (area) {
    default: console.log(`${area} configuration not enabled.`);
  }
};

/**
 * Placeholder for Operational/Watchdog directives.
 * @param area - The target operational vertical.
 */
export const menuOperate = async (area: string) => {
  switch (area) {
    default: console.log(`${area} operations not enabled.`);
  }
};

/**
 * Command Registry
 * Maps database 'privilege' strings to the local router functions.
 * Prevents the need for eval() and provides type-safe execution.
 */
const Actions: Record<string, (area: string) => Promise<void>> = {
  View: menuView,
  Edit: menuEdit,
  Create: menuCreate,
  Drop: menuDrop,
  Configure: menuConfigure,
  Operate: menuOperate,
};

/**
 * Primary Administrative Loop.
 * 
 * Logic Flow:
 * 1. Fetch authorized Menu structure via DB RBAC.
 * 2. Prompt for Subject Area selection.
 * 3. Prompt for Action selection (Sub-menu).
 * 4. Execute mapped function or handle 'Back/Esc' navigation.
 * 
 * @async
 */
export const Menu = async () => {
  do {
    setHeader(`Main Menu`);

    // Fetch dynamic menu based on current UserToken role
    const menu: Array<IOption> = await setMenu();
    const { select } = await Prompt(["select"], { message: " Main Menu:", choices: menu });

    const subjectOption = menu.find(({ value }) => isEqual(value, select));

    // Handle Graceful Exit
    if (subjectOption?.title === "End Session") {
      console.clear();
      console.log("Session ended.");
      process.exit(0);
    }

    if (subjectOption?.choices && subjectOption.choices.length > 0) {
      const actionResult = await Prompt(["select"], {
        message: " Authorized options:",
        choices: subjectOption.choices,
      });

      // UX: Handle 'Esc' or 'Ctrl+C' to return to Main Menu
      if (actionResult.select === undefined) continue;

      const suboption = subjectOption.choices.find(({ value }) => isEqual(value, actionResult.select));

      // UX: Handle explicit 'Back' choice
      if (suboption?.title === "Back") continue;

      // Action Dispatcher
      if (suboption?.func) {
        const actionFunction = Actions[suboption.func];
        const areaContext = suboption.area || subjectOption.title;

        if (actionFunction) {
          await actionFunction(areaContext);
        } else {
          console.error(`\n>> [ERROR] No logic mapped for Action: ${suboption.func}`);
        }
      }
    }
  } while (true);
};
