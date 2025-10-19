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

import * as Instrument from "db/interfaces/instrument";
import * as InstrumentPosition from "db/interfaces/instrument_position";
import * as References from "db/interfaces/reference";
import * as States from "db/interfaces/state";

const [tp, sl] = [`e4`, `df`];

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
  tpsl_id: number;
  order_state: Uint8Array;
  order_status: string;
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

export type TAppResponse = Array<{ instId: string | undefined; tpsl_id: number | undefined; memo: string }>;

//+--------------------------------------------------------------------------------------+
//| Submits application (auto) stop requests locally on Open positions;                  |
//+--------------------------------------------------------------------------------------+
const publish = async (current: Partial<IStopOrder>, props: Partial<IStopOrder>) => {
  if (Object.keys(current).length) {
    if (Object.keys(props).length) {
      const revised: Partial<IStops> = {
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
            update_time: props.update_time || new Date(Date.now()),
          },
          { table: `stop_request`, keys: [{ key: `stop_request` }] }
        );
        return result ? result.stop_request : undefined;
      }
    } else {
      console.log(">> [Error] Stop.Publish: No properties to update");
      return undefined;
    }
  } else {
    const request = {
      stop_request: props.stop_request,
      stop_type: props.stop_type,
      instrument_position: props.instrument_position,
      state: props.state,
      action: props.action,
      size: props.size,
      trigger_price: props.trigger_price,
      order_price: props.order_price,
      reduce_only: props.reduce_only,
      memo: props.memo || "[Info] Stop.Publish: Stop request does not exist; proceeding with submission",
      create_time: props.create_time,
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
  const order = await Select<IStopOrder>({ stop_request: props.stop_request }, { table: `stop_order` });

  if (order && order.length) {
    const [current] = order;

    if (isEqual(props.tpsl_id!, current.tpsl_id!)) {
      const [result] = await Update(
        {
          stop_request: props.stop_request,
          order_state: isEqual(props.order_state!, current.order_state!) ? undefined : props.order_state,
          actual_size: isEqual(props.actual_size!, current.actual_size!) ? undefined : props.actual_size,
        },
        { table: `stop_order`, keys: [{ key: `stop_request` }] }
      );
      return result ? result.stop_request : undefined;
    }
    console.log(">> [Error] Stops.Submit: TP/SL ID mismatch; unauthorized resubmission; stop request rejected");
  } else {
    const result = await Insert(
      {
        stop_request: props.stop_request,
        tpsl_id: props.tpsl_id,
        order_state: props.order_state,
        actual_size: props.actual_size,
      },
      { table: `stop_order`, keys: [{ key: `stop_request` }] }
    );
    return result ? result.stop_request : undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Submits application (auto) stop requests locally on Open positions;                  |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IStopOrder>): Promise<IStopRequest["stop_request"] | undefined> => {
  if (props && props.instrument_position) {
    if (props.stop_request) {
      const request = await Fetch({ stop_request: props.stop_request });

      if (request && request.length) {
        const [current] = request;

        if (props.create_time! > current.create_time!) {
          return undefined;
        }

        if (current.status === "Rejected") {
          const queued = await States.Key<IRequestState>({ status: "Queued" });
          const result = await publish(current, {
            ...props,
            state: queued,
            memo: `[Warning] Stops.Submit: Request exists; was previously rejected; resubmitted`,
          });
          return result ? result : undefined;
        }

        if (current.status === "Queued") {
          const result = await publish(current, {
            ...props,
            memo: props.status === "Queued" ? props.memo || `[Info] Stops.Submit: Request exists; was unprocessed; updated and resubmitted` : props.memo,
          });
          return result ? result : undefined;
        }

        if (current.status === "Fulfilled") {
          const fulfilled = await States.Key<IRequestState>({ status: "Fulfilled" });
          const result = await publish(current, {
            ...props,
            state: fulfilled,
            memo: props.status === "Fulfilled" ? props.memo || `[Info] Stops.Submit: Request exists; was fulfilled; updated and settled` : props.memo,
          });
          return result ? result : undefined;
        }

        //-- pending requests can be updated but not resubmitted; WIP: resubmission logic possibly 'hold' state?
        if (current.status === "Pending") {
          const result = await publish(current, { ...props, memo: `[Info] Stops.Submit: Stop request updated; put on hold; pending cancel and resubmit` });

          if (result) {
            const hold = await States.Key<IRequestState>({ status: "Hold" });
            const result = await publish(current, {
              ...props,
              state: hold,
            });
            return result ? result : undefined;
          } else return undefined;
        }
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
  }
};
