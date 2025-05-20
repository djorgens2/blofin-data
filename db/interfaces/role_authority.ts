//+---------------------------------------------------------------------------------------+
//|                                                                     role_authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { SubjectArea } from "@db/interfaces/subject";

import { Modify, Select } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

import * as Role from "@db/interfaces/role";
import * as Authority from "@db/interfaces/authority";
import * as Subject from "@db/interfaces/subject";

export interface IKeyProps {
  role_authority?: Uint8Array;
  subject?: Uint8Array;
  role?: Uint8Array;
  authority?: Uint8Array;
  area?: SubjectArea;
  title?: string;
  privilege?: string;
  enabled?: boolean;
}
export interface IRoleAuthority extends IKeyProps, RowDataPacket {}

//+--------------------------------------------------------------------------------------+
//| Imports all role access privileges with the supplied state; ** Admin Use Only;       |
//+--------------------------------------------------------------------------------------+
export const Import = async (props: { enabled: boolean }) => {
  const imports = await Select<IKeyProps>(`SELECT subject, role, authority FROM blofin.subject, blofin.role, blofin.authority`, []);
  for (let key = 0; key < imports.length; key++) {
    Object.assign(imports[key], { ...imports[key], role_authority: hashKey(6), ...props });
    const { role_authority, subject, role, authority, enabled } = imports[key];
    await Modify(`INSERT IGNORE INTO blofin.role_authority VALUES ( ?, ?, ?, ?, ?)`, [role_authority, subject, role, authority, enabled]);
  }
};

//+--------------------------------------------------------------------------------------+
//| Disables authority based on supplied properties;                                     |
//+--------------------------------------------------------------------------------------+
export async function Disable(props: IKeyProps): Promise<number> {
  const { where, args } = await setWhere(props);
  const sql = `UPDATE blofin.role_authority SET enabled = false`.concat(where);
  const result = await Modify(sql, args);
  return result.affectedRows;
}

//+--------------------------------------------------------------------------------------+
//| Enables authority based on supplied properties;                                      |
//+--------------------------------------------------------------------------------------+
export async function Enable(props: IKeyProps): Promise<number> {
  const { where, args } = await setWhere(props);
  const sql = `UPDATE blofin.role_authority SET enabled = true`.concat(where);
  const result = await Modify(sql, args);
  return result.affectedRows;
}

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<Partial<IRoleAuthority>>> {
  const { where, args } = await setWhere(props);
  const sql = `SELECT * FROM blofin.role_authority`.concat(where);
  return Select<IRoleAuthority>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Returns formatted where and args;                                                    |
//+--------------------------------------------------------------------------------------+
const setWhere = async (props: IKeyProps) => {
  const { area, title, privilege, enabled } = props;
  const subject = props.subject ? props.subject : await Subject.Key({ area });
  const role = props.role ? props.role : await Role.Key({ title });
  const authority = props.authority ? props.authority : await Authority.Key({ privilege });

  const args = [];
  const filters = [];

  if (role) {
    args.push(role);
    filters.push(`role = ?`);
  }

  if (subject) {
    args.push(subject);
    filters.push(`subject = ?`);
  }

  if (authority) {
    args.push(authority);
    filters.push(`authority = ?`);
  }

  if (enabled) {
    args.push(enabled);
    filters.push(`enabled = ?`);
  }
  let where: string = "";
  filters.forEach((filter, id) => (where += (id ? " AND " : " WHERE ") + filter));

  return { where, args };
};

//----------------------------------- views ------------------------------------------------------------------//

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export async function FetchSubjects(props: IKeyProps): Promise<Array<Partial<IRoleAuthority>>> {
  const { where, args } = await setWhere(props);
  const sql = `SELECT * FROM blofin.vw_role_subjects`.concat(where);
  return Select<IRoleAuthority>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export async function FetchPrivileges(props: IKeyProps): Promise<Array<Partial<IRoleAuthority>>> {
  const { where, args } = await setWhere(props);
  const sql = `SELECT * FROM blofin.vw_role_privileges`.concat(where);
  return Select<IRoleAuthority>(sql, args);
}
