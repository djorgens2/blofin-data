/**
 * @module Menu-Builder
 * @description RBAC-driven menu factory for the Command Bridge.
 * 
 * Maps Database Privilege Records into a hierarchical Prompt structure.
 * Uses Parallel-Fetch to ensure high-performance UI rendering.
 * 
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IOption } from "#cli/modules/Prompts";
import UserToken from "#cli/interfaces/user";
import * as RoleAuths from "#db/interfaces/role_authority";

/**
 * Generates an authorized menu tree based on the User's Role-Based Access Control profile.
 * 
 * @async
 * @returns {Promise<IOption[]>} A structured array of Subject Areas and their specific Privileges.
 */
export const setMenu = async (): Promise<IOption[]> => {
  const menu: Array<IOption> = [];
  const role = UserToken().role;

  // 1. Fetch High-Level Subject Areas (e.g., 'Users', 'Accounts')
  const auths = await RoleAuths.Subjects({ role, status: "Enabled" });

  // PERFORMANCE: Use Promise.all to fetch all sub-menus in parallel
  const menuTree = await Promise.all(auths.map(async (auth) => {
    const { task_group, group_name } = auth;

    // 2. Fetch specific actions for this specific area
    const privs = await RoleAuths.Privileges({
      role,
      task_group,
      status: "Enabled",
    });

    const submenu: IOption[] = privs.map((priv) => ({
      title: priv.privilege!,       // CLI Display: "View"
      value: priv.authority!,       // DB Reference
      func: priv.privilege!,        // Maps to 'Actions' Registry
      area: group_name!,    // Contextual target (e.g. "Users")
    }));

    // Navigation breadcrumb for Esc/Manual return
    submenu.push({
      title: "Back",
      value: Buffer.from([0, 0, 0]),
    });

    return {
      title: group_name!,
      value: task_group!,
      choices: submenu,
    };
  }));

  // Combine fetched tree with final session controls
  menu.push(...menuTree);
  menu.push({
    title: "End Session",
    value: Buffer.from([0, 0, 0]),
  });

  return menu;
};
