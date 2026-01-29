//+--------------------------------------------------------------------------------------+
//|                                                                          leverage.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ILeverageAPI } from "api/leverage";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";
import type { IPublishResult } from "db/query.utils";

import { Session } from "module/session";
import { PrimaryKey } from "db/query.utils";
import { hasValues, isEqual } from "lib/std.util";

import * as LeverageAPI from "api/leverage";
import * as InstrumentPosition from "db/interfaces/instrument_position";

//------------------ Public functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  if (!hasValues(props) || !props.instId || !props.positionSide || !props.leverage) {
    console.log("-> Leverage.Submit: Incomplete leverage properties provided", props);
    return {
      key: undefined,
      response: { success: false, code: 400, response: `null_query`, message: `Undefined leverage data provided`, rows: 0, context: "Leverage.Submit" },
    };
  }

  const instrument_position = await InstrumentPosition.Fetch({
    account: Session().account,
    symbol: props.instId,
    position: props.positionSide,
    status: "Closed",
  });

  if (!instrument_position) {
    return {
      key: undefined,
      response: { success: false, code: 404, response: `not_found`, message: `Position not available for update`, rows: 0, context: "Leverage.Submit" },
    };
  }
  const [current] = instrument_position;

  if (isEqual(parseInt(props.leverage), current.leverage!))
    return {
      key: PrimaryKey(current, ["instrument_position"]),
      response: { success: false, code: 402, response: `no_update`, message: `Leverage unchanged; no change detected`, rows: 0, context: "Leverage.Submit" },
    };
  console.log(`-> Leverage.Submit: Submitting leverage change for ${props.instId} ${props.positionSide} from ${current.leverage} to ${props.leverage}`);
  return await LeverageAPI.Submit(props);
};
