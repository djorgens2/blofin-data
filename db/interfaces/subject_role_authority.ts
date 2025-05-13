//+---------------------------------------------------------------------------------------+
//|                                                             subject_role_authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { SubjectArea } from "@db/interfaces/subject";

import { Modify, Select } from "@db/query.utils";

import * as Subject from "@db/interfaces/subject";
import * as Role from "@db/interfaces/role";
import * as Authority from "@db/interfaces/authority";

export interface IKeyProps {
  subject?: Uint8Array;
  role?: Uint8Array;
  authority?: Uint8Array;
  area?: SubjectArea;
  title?: string;
  privilege?: string;
}
export interface ISubjectRoleAuthority extends IKeyProps, RowDataPacket {
  task: string;
  priority: number;
}

//+--------------------------------------------------------------------------------------+
//| Imports all role access privileges with the supplied state; ** Admin Use Only;       |
//+--------------------------------------------------------------------------------------+
export const Import = async (props: { enabled: boolean }): Promise<number> => {
  const { enabled } = props;
  const loadAuthority = await Modify(
    `INSERT IGNORE INTO blofin.subject_role_authority SELECT subject, role, authority, ${enabled}
       FROM blofin.subject, blofin.role, blofin.authority`,
    []
  );
  return loadAuthority.affectedRows;
};

//+--------------------------------------------------------------------------------------+
//| Disables authority based on supplied properties;                                     |
//+--------------------------------------------------------------------------------------+
export async function Disable(props: IKeyProps): Promise<number> {
  const { where, args } = await setWhere(props);
  const sql = `UPDATE blofin.subject_role_authority SET enabled = false`.concat(where);
  const result = await Modify(sql, args);
  return result.affectedRows;
}

//+--------------------------------------------------------------------------------------+
//| Enables authority based on supplied properties;                                      |
//+--------------------------------------------------------------------------------------+
export async function Enable(props: IKeyProps): Promise<number> {
  const { where, args } = await setWhere(props);
  const sql = `UPDATE blofin.subject_role_authority SET enabled = true`.concat(where);
  const result = await Modify(sql, args);
  return result.affectedRows;
}

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<Partial<ISubjectRoleAuthority>>> {
  const { where, args } = await setWhere(props);
  const sql = `SELECT * FROM blofin.subject_role_authority`.concat(where);
  return Select<ISubjectRoleAuthority>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Returns formatted where and args;                                                    |
//+--------------------------------------------------------------------------------------+
const setWhere = async (props: IKeyProps) => {
  const { area, title, privilege } = props;
  const subject = props.subject ? props.subject : await Subject.Key({ area });
  const role = props.role ? props.role : await Role.Key({ title });
  const authority = props.authority ? props.authority : await Authority.Key({ privilege });

  const args = [];
  const filters = [];

  if (subject) {
    args.push(subject);
    filters.push(`subject = ?`);
  }

  if (role) {
    args.push(role);
    filters.push(`role = ?`);
  }
  role;

  if (authority) {
    args.push(authority);
    filters.push(`authority = ?`);
  }

  let where: string = "";
  filters.forEach((filter, id) => (where += id ? " AND " : " WHERE " + filter));

  return { where, args };
};
