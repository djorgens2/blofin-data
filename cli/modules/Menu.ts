//+--------------------------------------------------------------------------------------+
//|                                                                              Menu.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IOption } from "#cli/modules/Prompts";

import UserToken from "#cli/interfaces/user";

import * as RoleAuths from "#db/interfaces/role_authority";

//+--------------------------------------------------------------------------------------+
//| Creates the authorized menus based on the connected user role;                       |
//+--------------------------------------------------------------------------------------+
export const setMenu = async () => {
  const menu: Array<IOption> = [];
  const auths = await RoleAuths.Subjects({ role: UserToken().role, status: `Enabled` });

  for (const auth of auths) {
    const { subject_area, subject_area_title } = auth;
    const privs = await RoleAuths.Privileges({ role: UserToken().role, status: `Enabled` });

    const submenu = privs.map((priv) => ({
      title: priv.privilege!,
      value: priv.authority!,
      choices: [],
      func: `menu${priv.privilege}('${subject_area_title!}')`,
    }));

    submenu.push({ title: "Back", value: Buffer.from([0, 0, 0]), choices: [], func: `` });
    menu.push({ title: subject_area_title!, value: subject_area!, choices: submenu });
  }
  menu.push({ title: "End Session", value: Buffer.from([0, 0, 0]), choices: [] });
  return menu;
};
