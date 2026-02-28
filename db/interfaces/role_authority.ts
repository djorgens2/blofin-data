/**
 * Role-Authority Policy Management.
 * 
 * Manages the granular mapping of Roles to specific Authorities and Activities.
 * This module governs the "Security Grid," allowing for the enabling, 
 * disabling, and auditing of hierarchical system permissions.
 * 
 * @module db/role_authority
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { TAccess, IAccess } from "#db/interfaces/state";
import type { TResponse } from "#api";
import { Select, Distinct, Update, Load, State } from "#db";

/**
 * Interface representing a specific permission mapping within the security grid.
 * Combines role, subject area, activity, and authority metadata.
 */
export interface IRoleAuthority {
  /** Foreign Key: Link to the Role hash. */
  role: Uint8Array;
  /** Human-readable name of the role. */
  title: string;
  /** Foreign Key: Link to the functional Subject Area. */
  task_group: Uint8Array;
  group_name: string;
  /** Foreign Key: Link to the specific Task/Activity. */
  activity: Uint8Array;
  /** Human-readable name of the task. */
  task: string;
  /** Foreign Key: Link to the Privilege/Authority. */
  authority: Uint8Array;
  /** Human-readable name of the privilege. */
  privilege: string;
  /** Execution priority for the authority. */
  priority: number;
  /** Foreign Key: Access state hash. */
  state: Uint8Array;
  /** Human-readable status (e.g., 'Enabled', 'Disabled'). */
  status: TAccess;
}

/**
 * Administrative utility to synchronize the security grid.
 * 
 * Logic Flow:
 * 1. Queries `vw_audit_role_authority` to identify missing role/authority permutations.
 * 2. Resolves the target state hash based on the provided status.
 * 3. Performs a bulk {@link Load} into the `role_authority` table.
 * 
 * @param props - Object containing the initial {@link TAccess} status for new mappings.
 * @returns A promise that resolves once the Cartesian import is verified.
 */
export const Import = async (props: { status: TAccess }) => {
  const role_authority = await Select<IRoleAuthority>({}, { table: `vw_audit_role_authority` });
  const state = await State.Key({ status: props.status });

  if (role_authority.success && role_authority.data?.length && state) {
    console.log("In Role.Authority.Import:", new Date().toLocaleString());
    role_authority.data.forEach((auth) => (auth.state = state));
    Load<IRoleAuthority>(role_authority.data, { table: `role_authority` });
    console.log("   # Role Authority imports: ", role_authority.data.length, "verified");
  }
};

/**
 * Explicitly revokes a specific authority for a role-activity pair.
 * 
 * @param props - Criteria identifying the role, authority, and activity.
 * @param context - Tracing context for logging.
 * @returns A promise resolving to the database update response.
 */
export const Disable = async (props: Partial<IRoleAuthority>, context = "Role.Authority"): Promise<TResponse> => {
  const { role, authority, activity } = props;

  if (role && authority && activity) {
    const revised: Partial<IRoleAuthority> = {
      role,
      authority,
      activity,
      state: await State.Key<IAccess>({ status: "Disabled" }),
    };
    return await Update(revised, {
      table: `role_authority`,
      keys: [[`role`], [`authority`], [`activity`]],
      context: "Role.Authority.Disable",
    });
  } else return { success: false, code: 400, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context: "Role.Authority.Disable" };
};

/**
 * Explicitly grants a specific authority for a role-activity pair.
 * 
 * @param props - Criteria identifying the role, authority, and activity.
 * @param context - Tracing context for logging.
 * @returns A promise resolving to the database update response.
 */
export const Enable = async (props: Partial<IRoleAuthority>, context = "Role.Authority"): Promise<TResponse> => {
  context = `${context}.Enable`;
  const { role, authority, activity } = props;

  if (role && authority && activity) {
    const revised: Partial<IRoleAuthority> = {
      role,
      authority,
      activity,
      state: await State.Key<IAccess>({ status: "Enabled" }),
    };
    return await Update(revised, {
      table: `role_authority`,
      keys: [[`role`], [`authority`], [`activity`]],
      context: "Role.Authority.Enable",
    });
  } else return { success: false, code: 400, state: `null_query`, message: `[Error] ${context}:`, rows: 0, context };
};

/**
 * Retrieves granular privilege records from the `vw_role_authority` view.
 * 
 * @param props - Query filters. Pass `{}` for the full security grid.
 * @returns An array of matching role-authority records.
 */
export const Fetch = async (props: Partial<IRoleAuthority>): Promise<Array<Partial<IRoleAuthority>>> => {
  const result = await Select<IRoleAuthority>(props, { table: `vw_role_authority` });
  return result.success ? result.data! : [];
};

/**
 * Retrieves a distinct list of Subject Areas accessible to a specific role.
 * 
 * @param props - Criteria including `role` and optionally `status`.
 * @returns An array of unique subject area records for the role.
 */
export const Subjects = async (props: Partial<IRoleAuthority>): Promise<Array<Partial<IRoleAuthority>>> => {
  const result = await Distinct<IRoleAuthority>(
    { role: props.role, task_group: undefined, group_name: undefined, status: props.status },
    { table: `vw_role_authority`, keys: [[`role`], [`status`]] },
  );

  return result.success ? result.data! : [];
};

/**
 * Retrieves a distinct list of Privileges/Authorities assigned to a specific role.
 * 
 * @param props - Criteria including `role` and optionally `status`.
 * @returns An array of unique privilege records for the role.
 */
export const Privileges = async (props: Partial<IRoleAuthority>): Promise<Array<Partial<IRoleAuthority>>> => {
  const result = await Distinct<IRoleAuthority>(
    { role: props.role, authority: undefined, privilege: undefined, status: props.status },
    { table: `vw_role_authority`, keys: [[`role`], [`status`]] },
  );
  return result.success ? result.data! : [];
};
