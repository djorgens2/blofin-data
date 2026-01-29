//+---------------------------------------------------------------------------------------+
//|                                                                     role_authority.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TAccess, IAccess } from "db/interfaces/state";

import { Select, Distinct, Update, Load, TResponse } from "db/query.utils";

import * as State from "db/interfaces/state";

export interface IRoleAuthority {
  role: Uint8Array;
  title: string;
  subject_area: Uint8Array;
  subject_area_title: string;
  activity: Uint8Array;
  task: string;
  authority: Uint8Array;
  privilege: string;
  priority: number;
  state: Uint8Array;
  status: TAccess;
}

//+--------------------------------------------------------------------------------------+
//| Imports all role access privileges with the supplied state; ** Admin Use Only;       |
//| -- cartesian view to create all *missing* role authorities; set initial state;       |
//+--------------------------------------------------------------------------------------+
export const Import = async (props: { status: TAccess }) => {
  const role_authority = await Select<IRoleAuthority>({}, { table: `vw_audit_role_authority` });
  const state = await State.Key({ status: props.status });

  if (role_authority.length && state) {
    console.log("In Role.Authority.Import:", new Date().toLocaleString());
    role_authority.forEach((auth) => (auth.state = state));
    Load<IRoleAuthority>(role_authority, { table: `role_authority` });
    console.log("   # Role Authority imports: ", role_authority.length, "verified");
  }
};

//+--------------------------------------------------------------------------------------+
//| Disables authority based on supplied properties;                                     |
//+--------------------------------------------------------------------------------------+
export const Disable = async (props: Partial<IRoleAuthority>): Promise<TResponse> => {
  const { role, authority, activity } = props;

  if (role && authority && activity) {
    const revised: Partial<IRoleAuthority> = {
      role,
      authority,
      activity,
      state: await State.Key<IAccess>({ status: "Disabled" }),
    };
    return await Update(revised, { table: `role_authority`, keys: [{ key: `role` }, { key: `authority` }, { key: `activity` }], context: "Role.Authority.Disable" });
  } else return { success: false, code: 400, response: `null_query`, rows: 0, context: "Role.Authority.Disable" };
};

//+--------------------------------------------------------------------------------------+
//| Enables authority based on supplied properties;                                      |
//+--------------------------------------------------------------------------------------+
export const Enable = async (props: Partial<IRoleAuthority>): Promise<TResponse> => {
  const { role, authority, activity } = props;

  if (role && authority && activity) {
    const revised: Partial<IRoleAuthority> = {
      role,
      authority,
      activity,
      state: await State.Key<IAccess>({ status: "Enabled" }),
    };
    return await Update(revised, { table: `role_authority`, keys: [{ key: `role` }, { key: `authority` }, { key: `activity` }], context: "Role.Authority.Enable" });
  } else return { success: false, code: 400, response: `null_query`, rows: 0, context: "Role.Authority.Enable" };
};

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IRoleAuthority>): Promise<Array<Partial<IRoleAuthority>>> => {
  const result = await Select<IRoleAuthority>(props, { table: `vw_role_authority` });
  return result.length ? result : [];
};

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export const Subjects = async (props: Partial<IRoleAuthority>): Promise<Array<Partial<IRoleAuthority>>> => {
  const result = await Distinct<IRoleAuthority>(
    { role: props.role, subject_area: undefined, subject_area_title: undefined, status: props.status },
    { table: `vw_role_authority`, keys: [{ key: `role` }, { key: `status` }] }
  );

  return result.length ? result : [];
};

//+--------------------------------------------------------------------------------------+
//| Fetches privileges by auth/priv or returns all when requesting an empty set {};      |
//+--------------------------------------------------------------------------------------+
export const Privileges = async (props: Partial<IRoleAuthority>): Promise<Array<Partial<IRoleAuthority>>> => {
  const result = await Distinct<IRoleAuthority>(
    { role: props.role, authority: undefined, privilege: undefined, status: props.status },
    { table: `vw_role_authority`, keys: [{ key: `role` }, { key: "status" }] }
  );
  return result.length ? result : [];
};
