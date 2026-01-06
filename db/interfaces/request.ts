//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IOrder } from "db/interfaces/order";
import type { TRefKey } from "db/interfaces/reference";
import type { IRequestState, TRequestState } from "db/interfaces/state";
import type { IPublishResult } from "db/query.utils";

import { Insert, PrimaryKey, Update } from "db/query.utils";
import { hasValues, isEqual, setExpiry } from "lib/std.util";
import { hashKey } from "lib/crypto.util";
import { Session } from "module/session";

import * as Orders from "db/interfaces/order";
import * as States from "db/interfaces/state";
import * as References from "db/interfaces/reference";
import * as InstrumentPosition from "db/interfaces/instrument_position";

export interface IRequest {
  request: Uint8Array;
  instrument_position: Uint8Array;
  order_id: Uint8Array;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  state: Uint8Array;
  status: TRequestState;
  request_state: Uint8Array;
  request_status: TRequestState;
  margin_mode: "cross" | "isolated";
  position: "short" | "long" | "net";
  action: "buy" | "sell";
  request_type: Uint8Array;
  order_type: string;
  price: number;
  size: number;
  leverage: number;
  digits: number;
  memo: string;
  reduce_only: boolean;
  broker_id: string;
  create_time: Date;
  expiry_time: Date;
  update_time: Date;
}

//-- Private functions

//+--------------------------------------------------------------------------------------+
//| Applies updates to request on select columns;                                        |
//+--------------------------------------------------------------------------------------+
const publish = async (current: Partial<IOrder>, props: Partial<IOrder>): Promise<IPublishResult<IOrder>> => {
  if (hasValues<Partial<IOrder>>(current)) {
    if (hasValues<Partial<IOrder>>(props)) {
      const update_time = props.update_time || new Date();
      const state = props.status === "Hold" ? undefined : props.state || (await States.Key<IRequestState>({ status: props.status }));

      if (update_time > current.update_time!) {
        const revised: Partial<IOrder> = {
          request: current.request,
          order_id: isEqual(props.order_id!, current.order_id!) ? undefined : props.order_id,
          action: props.action === current.action ? undefined : props.action,
          state: isEqual(state!, current.state!) ? undefined : state,
          price: isEqual(props.price!, current.price!) ? undefined : props.price,
          size: isEqual(props.size!, current.size!) ? undefined : props.size,
          leverage: isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
          reduce_only: props.reduce_only ? (!!props.reduce_only === !!current.reduce_only ? undefined : !!props.reduce_only) : undefined,
          broker_id: props.broker_id === current.broker_id ? undefined : props.broker_id,
        };

        const result = await Update(revised, { table: `request`, keys: [{ key: `request` }] });

        if (result.success || !isEqual(props.expiry_time!, current.expiry_time!)) {
          const state = result.success && props.status === "Hold" ? await States.Key<IRequestState>({ status: "Hold" }) : undefined;
          const memo = result.success ? `[Info] Request expiry updated to ${props.expiry_time?.toLocaleString()}` : undefined;
          const revised = await Update(
            {
              request: current.request,
              state,
              memo: props.memo === current.memo ? memo : props.memo,
              expiry_time: isEqual(props.expiry_time!, current.expiry_time!) ? undefined : props.expiry_time,
              update_time,
            },
            { table: `request`, keys: [{ key: `request` }] }
          );

          return { key: PrimaryKey(current, [`request`]), response: revised };
        }
      }
      return { key: PrimaryKey(current, [`request`]), response: { success: false, code: 200, state: `exists`, message: `Request unchanged`, rows: 0 } };
    }
    console.log(">> [Error] Request.Publish: No update properties provided; request unchanged");
    return {
      key: PrimaryKey(current, [`request`]),
      response: {
        success: false,
        code: 400,
        state: `null_query`,
        message: "[Error] Request: No update properties provided; request unchanged",
        rows: 0,
      },
    };
  }

  if (hasValues<Partial<IRequest>>(props)) {
    const process_time = new Date();
    const queued = await States.Key<IRequestState>({ status: "Queued" });
    const request_type = await References.Key<TRefKey>({ source_ref: props.order_type || `limit` }, { table: `request_type` });
    const request: Partial<IRequest> = {
      request: props.request || hashKey(12),
      order_id: props.order_id,
      instrument_position: props.instrument_position,
      action: props.action,
      state: props.request ? props.state || queued : queued,
      price: props.price,
      size: props.size,
      leverage: props.leverage,
      request_type,
      margin_mode: props.margin_mode,
      reduce_only: props.reduce_only ? !!props.reduce_only : undefined,
      broker_id: props.broker_id || undefined,
      memo: props.memo || "[Info] Request.Publish: Request does not exist; proceeding with submission",
      create_time: props.create_time || process_time,
      expiry_time: props.expiry_time || setExpiry("8h", props.create_time || new Date()),
      update_time: props.update_time || process_time,
    };
    const result = await Insert<IRequest>(request, { table: `request` });
    return { key: PrimaryKey(request, [`request`]), response: result };
  }
  return { key: undefined, response: { success: false, code: 400, state: `null_query`, message: "[Error] Request.Publish: Nothing to publish", rows: 0 } };
};

//-- Public functions

//+--------------------------------------------------------------------------------------+
//| Cancels requests in local db meeting criteria; initiates cancel to broker;           |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (props: Partial<IOrder>): Promise<Array<IPublishResult<IRequest>>> => {
  const orders = await Orders.Fetch(props.request ? { request: props.request } : props);

  if (!orders) {
    console.log("[Error]: Unauthorized cancellation attempt");
    return [{ key: undefined, response: { success: false, code: 400, state: `null_query`, message: "[Error] Request.Cancel: Nothing to cancel", rows: 0 } }];
  }

  const [canceled, closed] = await Promise.all([States.Key<IRequestState>({ status: "Canceled" }), States.Key<IRequestState>({ status: "Closed" })]);

  const cancels = await Promise.all(
    orders.map(async (order) => {
      const state = isEqual(order.state!, canceled!) ? closed : canceled;
      const result = await publish(order, {
        ...order,
        state,
        memo: props.memo || `[Cancel]: Request ${props.request} canceled by user/system`,
      });
      return result;
    })
  );
  return cancels;
};

//+--------------------------------------------------------------------------------------+
//| Verify/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IRequest>): Promise<IPublishResult<IRequest>> => {
  if (!hasValues(props)) {
    console.log(">> [Error] Request.Submit: No request properties provided; request rejected");
    return { key: undefined, response: { success: false, code: 400, state: `null_query`, message: `No request properties provided`, rows: 0 } };
  }

  const query = props.instrument_position
    ? { instrument_position: props.instrument_position }
    : { account: props.account || Session().account, symbol: props.symbol, position: props.position };
  const exists = await InstrumentPosition.Fetch(query);

  if (!exists) {
    console.log(">> [Error] Request.Submit: Invalid request; missing instrument position; request rejected");
    return { key: undefined, response: { success: false, code: 404, state: `error`, message: `Instrument position not found`, rows: 0 } };
  }

  const [{ instrument_position, auto_status, leverage, margin_mode, open_request }] = exists;
  const search = props.request
    ? { request: props.request }
    : ({ instrument_position, status: open_request ? "Pending" : "Queued" } satisfies Partial<IRequest>);
  const found = await Orders.Fetch(search, { suffix: `ORDER BY update_time DESC LIMIT 1` });

  // Handle new request submission
  if (!found) {
    return await publish(
      {},
      {
        ...props,
        instrument_position,
        leverage: props.leverage || leverage,
        margin_mode: props.margin_mode || margin_mode,
        memo: props.memo || `[Warning] Request.Submit: Request missing; was added locally; updated and settled`,
      }
    );
  }

  const [current] = found;
  props.update_time === undefined && Object.assign(props, { update_time: Date() });

  if (props.update_time! > current.update_time!) {
    if (auto_status === "Enabled") {
      const queue = await Orders.Fetch({ instrument_position }, { suffix: `AND status IN ("Pending", "Queued")` });

      if (queue) {
        await Promise.all(
          queue
            .filter(({ request }) => !isEqual(request!, current.request!))
            .map(async ({ request }) => {
              Cancel({ request, memo: `[Warning] Request.Submit: New request on open instrument/position auto-cancels existing` });
            })
        );
      }
      props.status = current.status === "Pending" ? "Hold" : current.status;
    }

    if (props.status === "Hold") {
      return await publish(current, {
        ...props,
        memo: props.memo || `[Info] Request.Submit: Request updated; was put on hold; awaiting cancel for resubmit`,
      });
    }
    return await publish(current, { ...props, memo: props.memo || `[Info] Request.Submit: Request exists; updated locally` });
  }

  return {
    key: undefined,
    response: { success: true, code: 201, state: `exists`, message: `-> [Info] Request.Submit: Queued request verified`, rows: 0 },
  };
};
