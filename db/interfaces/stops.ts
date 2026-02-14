//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequestState, TPositionState } from "db/interfaces/state";
import type { IStopRequest } from "db/interfaces/stop_request";
import type { IPublishResult } from "db/query.utils";
import type { IStopsAPI } from "api/stops";

import { Select, Insert, Update, TOptions, PrimaryKey } from "db/query.utils";
import { Session } from "module/session";
import { hasValues, isEqual } from "lib/std.util";

export interface IStopOrder extends IStopRequest {
  tpsl_id: Uint8Array;
  client_order_id: Uint8Array;
  position_state: Uint8Array;
  position_status: TPositionState;
  request_state: Uint8Array;
  request_status: TRequestState;
  order_state: Uint8Array;
  order_status: string;
  order_category: Uint8Array;
  price_type: string;
  trigger_type: string;
  actual_size: number;
  leverage: number;
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from API view that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const API = async (status: TRequestState): Promise<Array<Partial<IStopsAPI>> | undefined> => {
  const result = await Select<IStopsAPI>({ status, account: Session().account }, { table: `vw_api_stop_requests` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IStopOrder>, options?: TOptions): Promise<Array<Partial<IStopOrder>> | undefined> => {
  Object.assign(props, { account: props.account || Session().account });
  const result = await Select<IStopOrder>(props, { ...options, table: `vw_stop_orders` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches a request key from local db that meet props criteria; notfound returns undef |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IStopOrder>, options?: TOptions): Promise<IStopOrder["stop_request"] | undefined> => {
  if (hasValues<Partial<IStopOrder>>(props)) {
    Object.assign(props, { account: props.account || Session().account });
    const [result] = await Select<IStopOrder>(props, { ...options, table: `vw_stop_orders` });
    return result ? result.stop_request : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Updates active stop orders retrieved, verified and keyed from the blofin api;        |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IStopOrder>): Promise<IPublishResult<IStopOrder>> => {
  if (!hasValues(props)) {
    console.log(">> [Error] Stop.Order.Publish: No order properties provided; publishing rejected");
    return {
      key: undefined,
      response: {
        success: false,
        code: 400,
        response: `null_query`,
        rows: 0,
        context: "Stop.Order.Publish",
        message: "No order properties provided; publishing rejected",
      },
    };
  }

  const exists = await Select<IStopOrder>({ tpsl_id: props.tpsl_id }, { table: `stop_order` });

  if (exists.length) {
    const [current] = exists;
    const revised: Partial<IStopOrder> = {
      tpsl_id: props.tpsl_id,
      order_state: isEqual(props.order_state!, current.order_state!) ? undefined : props.order_state,
      actual_size: isEqual(props.actual_size!, current.actual_size!) ? undefined : props.actual_size,
    };

    const result = await Update<IStopOrder>(revised, { table: `stop_order`, keys: [{ key: `tpsl_id` }], context: "Stops.Publish" });
    return { key: PrimaryKey(revised, ["tpsl_id"]), response: result };
  }

  const request: Partial<IStopOrder> = {
    tpsl_id: props.tpsl_id,
    client_order_id: props.client_order_id,
    order_state: props.order_state,
    order_category: props.order_category,
    price_type: props.price_type,
    trigger_type: props.trigger_type,
    actual_size: props.actual_size,
    leverage: props.leverage,
  };

  const result = await Insert(request, { table: `stop_order`, keys: [{ key: `tpsl_id` }], context: "Stops.Publish" });
  return { key: PrimaryKey(request, ["tpsl_id", "stop_type"]), response: { ...result, context: "Stops.Publish" } };
};
