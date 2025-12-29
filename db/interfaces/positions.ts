//+---------------------------------------------------------------------------------------+
//|                                                                          positions.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TStatus } from "db/interfaces/state";
import type { IPublishResult } from "db/query.utils";

import { Select, Insert, Update, PrimaryKey } from "db/query.utils";
import { hasValues, isEqual } from "lib/std.util";
import { Session } from "module/session";

import * as State from "db/interfaces/state";

export interface IPositions {
  account: Uint8Array;
  positions: Uint8Array;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  position: "short" | "long" | "net";
  state: Uint8Array;
  status: TStatus;
  instrument_type: Uint8Array;
  action: "buy" | "sell";
  counter_action: "buy" | "sell";
  size: number;
  size_available: number;
  leverage: number;
  margin_mode: "cross" | "isolated";
  margin_used: number;
  margin_ratio: number;
  margin_initial: number;
  margin_maint: number;
  average_price: number;
  liquidation_price: number;
  mark_price: number;
  unrealized_pnl: number;
  unrealized_pnl_ratio: number;
  adl: number;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Inserts or updates positions; returns positions key;                                 |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IPositions>): Promise<IPublishResult<IPositions>> => {
  if (hasValues(props)) {
    const positions = await Fetch({ account: Session().account, positions: props.positions });

    if (positions) {
      const [current] = positions;
      const revised: Partial<IPositions> = {
        positions: current.positions,
        size: isEqual(props.size!, current.size!) ? undefined : props.size,
        size_available: isEqual(props.size_available!, current.size_available!) ? undefined : props.size_available,
        leverage: isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
        margin_mode: props.margin_mode! === current.margin_mode! ? undefined : props.margin_mode,
        margin_used: isEqual(props.margin_used!, current.margin_used!) ? undefined : props.margin_used,
        margin_ratio: isEqual(props.margin_ratio!, current.margin_ratio!) ? undefined : props.margin_ratio,
        margin_initial: isEqual(props.margin_initial!, current.margin_initial!) ? undefined : props.margin_initial,
        margin_maint: isEqual(props.margin_maint!, current.margin_maint!) ? undefined : props.margin_maint,
        average_price: isEqual(props.average_price!, current.average_price!) ? undefined : props.average_price,
        mark_price: isEqual(props.mark_price!, current.mark_price!) ? undefined : props.mark_price,
        liquidation_price: isEqual(props.liquidation_price!, current.liquidation_price!) ? undefined : props.liquidation_price,
        unrealized_pnl: isEqual(props.unrealized_pnl!, current.unrealized_pnl!) ? undefined : props.unrealized_pnl,
        unrealized_pnl_ratio: isEqual(props.unrealized_pnl_ratio!, current.unrealized_pnl_ratio!) ? undefined : props.unrealized_pnl_ratio,
        adl: isEqual(props.adl!, current.adl!) ? undefined : props.adl,
        create_time: isEqual(props.create_time!, current.create_time!) ? undefined : props.create_time,
        update_time: isEqual(props.update_time!, current.update_time!) ? undefined : props.update_time,
      };
      const result = await Update(revised, { table: `positions`, keys: [{ key: `positions` }] });
      return {
        key: PrimaryKey(current, ["positions", "instrument_position"]),
        response: result,
      };
    } else {
      const result = await Insert<IPositions>(props, { table: `positions` });
      return {
        key: PrimaryKey(props, ["positions", "instrument_position"]),
        response: result,
      };
    }
  } else return { key: undefined, response: { success: false, code: 400, category: `null_query`, rows: 0 } };
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IPositions>): Promise<Array<Partial<IPositions>> | undefined> => {
  const result = await Select<IPositions>(props, { table: `vw_positions` });
  return result.length ? result : undefined;
};
