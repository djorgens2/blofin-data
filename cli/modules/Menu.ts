//+--------------------------------------------------------------------------------------+
//|                                                                              User.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use server";
"use strict";

import type { IOption } from "@cli/modules/Prompts";
import UserToken from "@cli/interfaces/user";
import * as RoleAuths from "@db/interfaces/role_authority";

//+--------------------------------------------------------------------------------------+
//| Creates the authorized menus based on the connected user role;                       |
//+--------------------------------------------------------------------------------------+
export const setMenu = async () => {
  const menu: Array<IOption> = [];
  const auths = await RoleAuths.FetchSubjects({ role: UserToken().role });

  for (let key = 0; key < auths.length; key++) {
    const { role, subject, area } = auths[key];
    const privs = await RoleAuths.FetchPrivileges({ role, subject, enabled: true });
    const submenu = privs.map((priv) => ({
      title: priv.privilege!,
      value: priv.authority!,
      choices: [],
      func: `menu${priv.privilege}('${area!}')`,
    }));

    submenu.push({ title: "Back", value: Buffer.from([0, 0, 0]), choices: [], func: `` });
    menu.push({ title: area!, value: subject!, choices: submenu });
  }
  menu.push({ title: "End Session", value: Buffer.from([0, 0, 0]), choices: [] });
  return menu;
};
