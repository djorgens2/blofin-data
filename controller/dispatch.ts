/**
 * @function dispatchJobCommand
 * @description Validates roles and instrument status before issuing a command.
 * Enforces Constraints 1 (Configure Role) and 3 (Enabled Status).
 */

"use strict";

import type { IUserAuthority } from "#db";

import { InstrumentPosition, JobControl } from "#db";
import { Select } from "#db";

export interface IDispatcher {
  user: Uint8Array;
  instrument_position: Uint8Array;
  command: "start" | "stop" | "restart";
  message: string;
}

export const dispatchJobCommand = async (props: IDispatcher) => {
  // Constraint 1 & 2: Role-based Authorization
  const authorized = await Select<IUserAuthority>({user: props.user, subject_area: "Jobs", privilege: "Operate" }, {table: "vw_user_authority"});

  if (!authorized.success ) {
    throw new Error("Unautorized access: verify your privileges with your administrator.");
  }

  // Constraint 3: Verify the Instrument is 'Enabled'
  const enabled= await InstrumentPosition.Fetch({ instrument_position: props.instrument_position, auto_status: 'Enabled' });
  if (!enabled) {
    throw new Error("Invalid Action: Instrument must be 'Enabled' to manage jobs.");
  }

  // Constraint 5: Pure Intent (Update DB only)
  await JobControl.Command(props);

  console.log(`-> [Queued] Command '${props.command}' for ${enabled[0].symbol}`);
};
