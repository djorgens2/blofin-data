//+--------------------------------------------------------------------------------------+
//|                                                                          leverage.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { ILeverageAPI } from "api/leverage";
import type { IInstrumentPosition } from "db/interfaces/instrument_position"
import { Session } from "module/session";
import { hasValues, isEqual } from "lib/std.util";

import * as LeverageAPI from "api/leverage";
import * as InstrumentPosition from "db/interfaces/instrument_position";
import { IPublishResult, PrimaryKey } from "db/query.utils";

//------------------ Public functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Sets the Status for the Instrument Position once updated via API/WSS ;               |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<ILeverageAPI>): Promise<IPublishResult<IInstrumentPosition>> => {
  if (!hasValues(props) || !props.instId || !props.positionSide || !props.leverage) {
    return { key: undefined, response: { success: false, code: 400, state: `null_query`, message: `Undefined leverage data provided`, rows: 0 } };
  }

  const instrument_position = await InstrumentPosition.Fetch({
    account: Session().account,
    symbol: props.instId,
    position: props.positionSide,
    status: "Closed",
  });

  if (!instrument_position) {
    return { key: undefined, response: { success: false, code: 404, state: `not_found`, message: `Missing Instrument Position`, rows: 0 } };
  }
  const [current] = instrument_position;

  if (isEqual(props.leverage, current.leverage!))
    return {
      key: PrimaryKey(current, ["instrument_position"]),
      response: { success: false, code: 402, state: `no_update`, message: `Leverage unchanged; no change detected`, rows: 0 },
    };

  return await LeverageAPI.Submit(props);
};
