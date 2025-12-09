//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IOrder } from "db/interfaces/order";
import type { TRefKey } from "db/interfaces/reference";
import type { IRequestState, TRequest } from "db/interfaces/state";

import { Insert, Update } from "db/query.utils";
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
  status: TRequest;
  request_state: Uint8Array;
  request_status: TRequest;
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
const publish = async (current: Partial<IRequest>, props: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  if (hasValues<Partial<IRequest>>(current)) {
    if (hasValues<Partial<IRequest>>(props)) {
      console.log(">> [Info] Request.Publish: Updating existing request:", current.request);;
      const update_time = props.update_time || new Date();
      const state = props.status === "Hold" ? undefined : props.state || (await States.Key<IRequestState>({ status: props.status }));

      if (update_time > current.update_time!) {
        const revised: Partial<IRequest> = {
          request: current.request,
          order_id: isEqual(props.order_id!, current.order_id!) ? undefined : props.order_id,
          action: props.action === current.action ? undefined : props.action,
          state: isEqual(state!, current.state!) ? undefined : state,
          price: isEqual(props.price!, current.price!) ? undefined : props.price,
          size: isEqual(props.size!, current.size!) ? undefined : props.size,
          leverage: isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
          reduce_only: props.reduce_only ? (!!props.reduce_only === !!current.reduce_only ? undefined : !!props.reduce_only) : undefined,
          broker_id: props.broker_id === current.broker_id ? undefined : props.broker_id,
          expiry_time: isEqual(props.expiry_time!, current.expiry_time!) ? undefined : props.expiry_time,
        };

        const [result, updates] = await Update(revised, { table: `request`, keys: [{ key: `request` }] });

        if (result && updates) {
          const state = props.status === "Hold" ? await States.Key<IRequestState>({ status: "Hold" }) : undefined;
          const [result, updates] = await Update(
            {
              request: current.request,
              state,
              memo: props.memo === current.memo ? undefined : props.memo,
              update_time,
            },
            { table: `request`, keys: [{ key: `request` }] }
          );

          return result ? result.request : undefined;
        } else return undefined;
      } else return undefined;
    } else {
      console.log(">> [Error] Request.Publish: No properties to update");
      return undefined;
    }
  } else {
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
    return result ? result.request : undefined;
  }
};

//-- Public functions

//+--------------------------------------------------------------------------------------+
//| Cancels requests in local db meeting criteria; initiates cancel to broker;           |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (props: Partial<IOrder>): Promise<Array<IRequest["request"]>> => {
  const orders = await Orders.Fetch(props.request ? { request: props.request } : props);

  if (orders) {
    const canceled = await States.Key<IRequestState>({ status: "Canceled" });
    const cancels: Array<IRequest["request"]> = [];

    for (const order of orders) {
      const result = await publish(order, {
        ...props,
        state: canceled,
        memo: props.memo || `[Cancel]: Request ${props.request} canceled by user/system`,
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
//| Verify/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  if (hasValues(props)) {
    const query = props.instrument_position
      ? { instrument_position: props.instrument_position }
      : { account: props.account || Session().account, symbol: props.symbol, position: props.position };
    const [result] = (await InstrumentPosition.Fetch(query)) ?? [];
    const { instrument_position, auto_status, leverage, margin_mode, open_request } = result;

    if (instrument_position) {
      const query = props.request
        ? { request: props.request }
        : ({ instrument_position, status: open_request ? "Pending" : "Queued" } satisfies Partial<IRequest>);
      const [current] = (await Orders.Fetch(query, { suffix: `ORDER BY update_time DESC LIMIT 1` })) ?? [{ request: undefined }];

      if (current.request) {
        if (props.update_time! > current.update_time!) {
          if (auto_status === "Enabled") {
            const promise = Orders.Fetch({ instrument_position }, { suffix: `AND status IN ("Pending", "Queued")` }) ?? [{}];
            const queue = await promise;
            if (queue) {
              const cancels = queue.filter(({ request }) => !isEqual(request!, current.request!));
              const promises = cancels.map(({ request }) =>
                Cancel({ request, memo: `[Request.Submit]: New request on open instrument/position auto-cancels` })
              );
              await Promise.all(promises);
              props.status = props.status === "Pending" ? "Hold" : props.status;
            }
          }

          if (props.status === "Hold") {
            const result = await publish(current, {
              ...props,
              memo: props.memo || `[Info] Request.Submit: Request updated; was put on hold; awaiting cancel for resubmit`,
            });
            return result ? result : undefined;
          } else {
            await publish(current, { ...props, memo: props.memo || `[Info] Request.Submit: Request exists; updated locally` });
            return current.request;
          }
        } else return current.request;
      } else {
        // Handle new request submission
        const result = await publish(
          {},
          {
            ...props,
            instrument_position,
            leverage: props.leverage || leverage,
            margin_mode: props.margin_mode || margin_mode,
            memo: props.memo || `[Warning] Request.Submit: Request missing; was added locally; updated and settled`,
          }
        );
        return result ? result : undefined;
      }
    } else {
      console.log(">> [Error] Request.Submit: Invalid request; missing instrument position; request rejected");
      return undefined;
    }
  }
};
