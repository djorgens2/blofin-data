/**
 * Account Leverage State Controller.
 * 
 * Acts as the business logic gatekeeper for leverage modifications. 
 * Enforces a "Settled State" policy: leverage can only be modified when 
 * an instrument position is 'Closed' and no active exposure exists.
 * 
 * @module db/leverage
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import type { IPublishResult, ILeverageAPI } from "#api";
import type { IInstrumentPosition } from "#db";
import { Leverages } from "#api";
import { PrimaryKey, InstrumentPosition } from "#db";
import { Session } from "#module/session";
import { hasValues, isEqual } from "#lib/std.util";

/**
 * Validates and submits a leverage change request to the exchange.
 * 
 * Risk Management Logic:
 * 1. Verifies all required fields (`instId`, `positionSide`, `leverage`) are present.
 * 2. Checks `instrument_position` for the active account.
 * 3. **Critical Constraint**: Ensures the position status is `Closed`. Leverage 
 *    changes are prohibited if a position is currently open or pending.
 * 4. **Diff Check**: Prevents redundant API calls if the requested leverage 
 *    already matches the stored value.
 * 5. If validated, hands off the execution to the {@link Leverages.Submit} API method.
 * 
 * @param props - Desired leverage settings from the UI or automation engine.
 * @returns A promise resolving to the API response or a validation error result.
 */
export const Submit = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  if (!hasValues(props) || !props.instId || !props.positionSide || !props.leverage) {
    console.log("-> Leverage.Submit: Incomplete leverage properties provided", props);
    return {
      key: undefined,
      response: { 
        success: false, 
        code: 400, 
        state: `null_query`, 
        message: `Undefined leverage data provided`, 
        rows: 0, 
        context: "Leverage.Submit" 
      },
    };
  }

  // Ensure we are only touching positions that are officially 'Closed'
  const instrument_position = await InstrumentPosition.Fetch({
    account: Session().account,
    symbol: props.instId,
    position: props.positionSide,
    status: "Closed", 
  });

  if (!instrument_position) {
    return {
      key: undefined,
      response: { 
        success: false, 
        code: 404, 
        state: `not_found`, 
        message: `Position not available for update (might be open or pending)`, 
        rows: 0, 
        context: "Leverage.Submit" 
      },
    };
  }
  
  const [current] = instrument_position;

  // Prevent redundant "no-op" API calls
  if (isEqual(parseInt(props.leverage), current.leverage!)) {
    return {
      key: PrimaryKey(current, ["instrument_position"]),
      response: { 
        success: false, 
        code: 402, 
        state: `no_update`, 
        message: `Leverage unchanged; no change detected`, 
        rows: 0, 
        context: "Leverage.Submit" 
      },
    };
  }

  console.log(`-> Leverage.Submit: Submitting leverage change for ${props.instId} ${props.positionSide} from ${current.leverage} to ${props.leverage}`);
  
  return await Leverages.Submit(props);
};
