//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState, TRequest, TStatus } from "db/interfaces/state";

import { Select, Insert, Update, TOptions } from "db/query.utils";
import { hexify, uniqueKey } from "lib/crypto.util";
import { Session } from "module/session";
import { hasValues, isEqual } from "lib/std.util";

import * as InstrumentPosition from "db/interfaces/instrument_position";
import * as States from "db/interfaces/state";

export interface IStopRequest {
  instrument_position: Uint8Array;
  stop_request: Uint8Array;
  state: Uint8Array;
  status: TRequest;
  stop_type: "tp" | "sl";
  action: "buy" | "sell";
  size: number;
  trigger_price: number;
  order_price: number;
  reduce_only: boolean;
  memo: string;
  broker_id: string;
  create_time: Date;
  update_time: Date;
}

export interface IStopOrder extends IStopRequest {
  stop_order: Uint8Array;
  tpsl_id: Uint8Array;
  client_order_id: Uint8Array;
  order_state: Uint8Array;
  order_status: string;
  order_category: Uint8Array;
  price_type: string;
  actual_size: number;
}

export interface IStops extends IStopOrder {
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  position: "short" | "long" | "net";
  position_state: Uint8Array;
  position_status: TStatus;
  request_state: Uint8Array;
  request_status: TRequest;
}

//+--------------------------------------------------------------------------------------+
//| Submits application (auto) stop requests locally on Open positions;                  |
//+--------------------------------------------------------------------------------------+
const publish = async (current: Partial<IStopOrder>, props: Partial<IStopOrder>) => {
  if (Object.keys(current).length) {
    if (Object.keys(props).length) {
      const revised: Partial<IStops> = {
        stop_request: props.stop_request,
        size: isEqual(props.size!, current.size!) ? undefined : props.size,
        trigger_price: isEqual(props.trigger_price!, current.trigger_price!) ? undefined : props.trigger_price,
        order_price: isEqual(props.order_price!, current.order_price!) ? undefined : props.order_price,
        reduce_only: !!props.reduce_only! === !!current.reduce_only! ? undefined : props.reduce_only,
        create_time: isEqual(props.create_time!, current.create_time!) ? undefined : props.create_time,
      };

      const [result, updates] = await Update(revised, { table: `stop_request`, keys: [{ key: `stop_request` }] });

      if (result && updates) {
        const [result, updates] = await Update(
          {
            stop_request: props.stop_request,
            memo: props.memo === current.memo ? undefined : props.memo,
            update_time: props.update_time || new Date(),
          },
          { table: `stop_request`, keys: [{ key: `stop_request` }] }
        );
        return result ? result.stop_request : undefined;
      } else return undefined;
    } else {
      console.log(">> [Error] Stop.Publish: No properties to update");
      return undefined;
    }
  } else {
    const queued = await States.Key<IRequestState>({ status: "Queued" });
    const request = {
      stop_request: props.stop_request,
      stop_order: props.stop_order,
      stop_type: props.stop_type,
      instrument_position: props.instrument_position,
      state: props.state || queued,
      action: props.action,
      size: props.size,
      trigger_price: props.trigger_price,
      order_price: props.order_price,
      reduce_only: props.reduce_only,
      memo: props.memo || "[Info] Stop.Publish: Stop request does not exist; proceeding with submission",
      create_time: props.create_time,
      update_time: new Date(),
    };

    const result = await Insert(request, { table: "stop_request" });
    return result ? result.stop_request : undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IStops>, options: TOptions = { table: `vw_stop_orders` }): Promise<Array<Partial<IStops>> | undefined> => {
  Object.assign(props, { account: props.account || Session().account });
  const result = await Select<IStopOrder>(props, options);
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches a request key from local db that meet props criteria; notfound returns undef |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IStops>, options: TOptions = { table: `vw_stop_orders` }): Promise<IStopOrder["stop_request"] | undefined> => {
  if (hasValues<Partial<IStops>>(props)) {
    Object.assign(props, { account: props.account || Session().account });
    const [result] = await Select<IStopOrder>(props, options);
    return result ? result.stop_request : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Updates active stop orders retrieved, verified and keyed from the blofin api;        |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IStopOrder>) => {
  const order = await Select<IStopOrder>({ stop_order: props.stop_order }, { table: `stop_order` });

  if (order && order.length) {
    const [current] = order;

    if (isEqual(props.tpsl_id!, current.tpsl_id!)) {
      const [result] = await Update(
        {
          stop_order: props.stop_order,
          order_state: isEqual(props.order_state!, current.order_state!) ? undefined : props.order_state,
          actual_size: isEqual(props.actual_size!, current.actual_size!) ? undefined : props.actual_size,
        },
        { table: `stop_order`, keys: [{ key: `stop_order` }] }
      );
      return result ? result.stop_order : undefined;
    }
    console.log(">> [Error] Stops.Submit: TP/SL ID mismatch; unauthorized resubmission; stop request rejected");
  } else {
    const result = await Insert(
      {
        stop_order: props.stop_order,
        tpsl_id: props.tpsl_id,
        client_order_id: props.client_order_id,
        order_state: props.order_state,
        order_category: props.order_category,
        price_type: props.price_type,
        actual_size: props.actual_size,
      },
      { table: `stop_order`, keys: [{ key: `stop_order` }] }
    );
    return result ? result.tpsl_id : undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Cancels requests in local db meeting criteria; initiates cancel to broker;           |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (props: Partial<IStops>): Promise<Array<IStops["stop_request"]>> => {
  const orders = await Fetch(props.stop_request ? { stop_request: props.stop_request } : props);

  if (orders) {
    const canceled = await States.Key<IRequestState>({ status: "Canceled" });
    const cancels: Array<IStops["stop_request"]> = [];

    for (const order of orders) {
      const result = await publish(props, {
        ...props,
        state: canceled,
        memo: props.memo || `[Cancel]: Request ${props.stop_request} canceled by user/system`,
      });
      result && cancels.push(result);
    }
    return cancels;
  } else {
    console.error("[Error]: Unauthorized cancellation attempt");
    return [];
  }
};

//+--------------------------------------------------------------------------------------+
//| Submits application (auto) stop requests locally on Open positions;                  |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IStops>): Promise<IStopRequest["stop_request"] | undefined> => {
  if (props) {
    if (props.stop_request) {
      const request = await Fetch({ stop_request: props.stop_request });

      if (request) {
        const [current] = request;
        const state =
          isEqual(current.state!, props.state!) && isEqual(current.status!, props.status!)
            ? current.state
            : await States.Key<IRequestState>({ status: props.status! });

        if (props.update_time! > current.update_time!) {
          if (current.tpsl_id && current.status === "Pending" && isEqual(current.state!, props.state!)) {
            const hold = await States.Key<IRequestState>({ status: "Hold" });

            const result = await publish(current, {
              ...props,
              state: hold,
              memo: `[Info] Stops.Submit: Stop request updated; put on hold; pending cancel and resubmit`,
            });

            return result ? result : undefined;
          } else {
            await publish(current, { ...props, state, memo: props.memo || `[Info] Stops.Submit: Stop request exists; updated locally` });
            return current.stop_request;
          }
        } else return undefined;
      } else {
        const result = await publish(
          {},
          {
            ...props,
            memo: props.memo || `[Warning] Stops.Submit: Request missing; was added locally; updated and settled`,
          }
        );
        return result ? result : undefined;
      }
    }

    // Handle new request submission
    const result = await InstrumentPosition.Fetch({ account: props.account || Session().account, symbol: props.symbol, position: props.position });

    if (result) {
      const [{ auto_status, instrument_position }] = result;
      auto_status === "Enabled" && Cancel({ instrument_position, memo: `[Info] Stops.Submit: New stop request submitted; canceling existing pending stop(s)` });
      return await publish(
        {},
        { ...props, stop_request: hexify(uniqueKey(8), 4, props.stop_type === "tp" ? `e4` : `df`), instrument_position, status: "Queued" }
      );
    } else {
      console.log(">> [Error] Stops.Submit: Invalid stop request; missing instrument position; request rejected");
      return undefined;
    }
  }
};
