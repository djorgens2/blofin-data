//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "api/requests";
import type { IOrder } from "db/interfaces/order";
import type { IRequestState, TRequest } from "db/interfaces/state";

import { Select, Insert, Update } from "db/query.utils";
import { hashKey } from "lib/crypto.util";
import { isEqual, setExpiry } from "lib/std.util";
import { Session } from "module/session";

import * as Orders from "db/interfaces/order";
import * as States from "db/interfaces/state";
import * as InstrumentPosition from "db/interfaces/instrument_position";

export interface IRequest {
  request: Uint8Array;
  instrument_position: Uint8Array;
  order_id: number;
  client_order_id: string;
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
  if (Object.keys(current).length) {
    if (Object.keys(props).length) {
      // Compare current and props to find differences
      const request: Partial<IRequest> = {
        request: current.request,
        action:props.action === current.action ? undefined : props.action,
        state:isEqual(props.state!, current.state!) ? undefined : props.state,
        price:isEqual(props.price!, current.price!) ? undefined : props.price,
        size:isEqual(props.size!, current.size!) ? undefined : props.size,
        leverage:isEqual(props.leverage!, current.leverage!) ? undefined : props.leverage,
        margin_mode:isEqual(props.margin_mode!, current.margin_mode!) ? undefined : props.margin_mode,
        reduce_only:!!props.reduce_only === !!current.reduce_only ? undefined : props.reduce_only,
        broker_id:props.broker_id === current.broker_id ? undefined : props.broker_id,
        expiry_time:isEqual(props.expiry_time!, current.expiry_time!) ? undefined : props.expiry_time,
        update_time:isEqual(props.update_time!, current.update_time!) ? undefined : props.update_time,
      };

      const [result, updates] = await Update(request, { table: `request`, keys: [{ key: `request` }] });

      if (result && updates) {
        const [result, updates] = await Update(
          {
            request: props.request,
            memo: props.memo || undefined,
          },
          { table: `request`, keys: [{ key: `request` }] }
        );

        updates && console.log(">> Request.Publish:", updates);

        return result ? result.request : undefined;
      } else return undefined;
    } else {
      console.log(">> [Error] Request.Publish: No properties to update");
      return undefined;
    }
  } else {
    const process_time = new Date();
    const result = await Insert<IRequest>(
      {
        request: props.request || hashKey(12),
        instrument_position: props.instrument_position!,
        action: props.action!,
        state: props.state!,
        price: props.price!,
        size: props.size!,
        leverage: props.leverage!,
        request_type: props.request_type!,
        margin_mode: props.margin_mode!,
        reduce_only: props.reduce_only || false,
        broker_id: props.broker_id || undefined,
        memo: props.memo || undefined,
        create_time: props.create_time || process_time,
        expiry_time: props.expiry_time || setExpiry("8h"),
        update_time: process_time,
      },
      { table: `request` }
    );

    result && console.log(">> Request.Publish:", result);
    return result ? result.request : undefined;
  }
};

//-- Public functions

//+--------------------------------------------------------------------------------------+
//| Reconciles changes triggered via diffs between local db and broker;                  |
//+--------------------------------------------------------------------------------------+
export const Audit = async (): Promise<Array<Partial<IOrder>>> => {
  const audit = await Select<IOrder>({ account: Session().account }, { table: `vw_orders`, suffix: `AND status != request_status` });

  if (audit.length) {
    console.log(`In Request.Audit [${audit.length}]`);
    for (const request of audit)
      await publish(request, {
        ...request,
        state: request.request_state,
        memo: `[Audit]: Request State updated from ${request.status} to ${request.request_status}`,
      });
  }
  return audit;
};

//+--------------------------------------------------------------------------------------+
//| Returns filtered requests from the db for processing/synchronization with broker;    |
//+--------------------------------------------------------------------------------------+
export const Queue = async (props: Partial<IRequestAPI>): Promise<Array<Partial<IRequestAPI>> | undefined> => {
  Object.assign(props, { account: props.account || Session().account });
  const result = await Select<IRequestAPI>(props, { table: `vw_api_requests` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Cancels requests in local db meeting criteria; initiates cancel to broker;           |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (props: Partial<IOrder>): Promise<Array<IRequest["request"]>> => {
  const cancels: Array<IRequest["request"]> = [];
  const canceled = await States.Key<IRequestState>({ status: "Canceled" });

  if (props.request && props.account)
    if (isEqual(props.account, Session().account!)) {
      const result = await publish(props, { ...props, state: canceled, memo: props.memo || `[Cancel]: Request ${props.request} canceled by user/system` });
      return result ? [result] : [];
    } else {
      console.log(">> [Error] Request.Cancel: Unauthorized cancel attempt; account mismatch");
      return [];
    }

  const results = await Orders.Fetch(props);
  results &&
    results.forEach(async ({ request }) => {
      const result = await publish(props, { ...props, state: canceled, memo: props.memo || `[Cancel]: Request ${request} canceled by user/system` });
      result && cancels.push(result);
    });

  return cancels;
};

//+--------------------------------------------------------------------------------------+
//| Closes requests in local db meeting criteria;                                        |
//+--------------------------------------------------------------------------------------+
export const Close = async (props: Partial<IOrder>): Promise<Array<IRequest["request"]>> => {
  const closes: Array<IRequest["request"]> = [];
  const closed = await States.Key<IRequestState>({ status: "Closed" });

  if (props.request && props.account)
    if (isEqual(props.account, Session().account!)) {
      const result = await publish(props, { ...props, state: closed, memo: props.memo || `[Close]: Request ${props.request} closed by user/system` });
      return result ? [result] : [];
    } else {
      console.log(">> [Error] Request.Close: Unauthorized close attempt; account mismatch");
      return [];
    }

  const results = await Orders.Fetch(props);
  results &&
    results.forEach(async ({ request }) => {
      const result = await publish(props, { ...props, state: closed, memo: props.memo || `[Close]: Request ${request} closed by user/system` });
      result && closes.push(result);
    });

  return closes;
};

//+--------------------------------------------------------------------------------------+
//| Verify/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  if (props && props.instrument_position) {
    //-- handle updates to existing request
    if (props.request) {
      const request = await Orders.Fetch({ request: props.request });

      if (request) {
        const [current] = request;

        if (current.status === "Canceled" || current.status === "Closed") {
          // console.log(">> [Warning: Request.Submit] Request exists; was canceled and not resubmitted:", { exists, submit });
          return current.request;
        }

        if (current.status === "Rejected") {
          const queued = await States.Key<IRequestState>({ status: "Queued" });
          const result = await publish(current, {
            ...props,
            state: queued,
            memo: `[Warning] Request.Submit: Request exists; was previously rejected; resubmitted`,
          });
          return result ? result : undefined;
        }

        if (current.status === "Queued") {
          const result = await publish(current, {
            ...props,
            memo: props.status === "Queued" ? props.memo || `[Info] Request.Submit: Request exists; was unprocessed; updated and resubmitted` : props.memo,
          });
          return result ? result : undefined;
        }

        if (current.status === "Fulfilled") {
          const fulfilled = await States.Key<IRequestState>({ status: "Fulfilled" });
          const result = await publish(current, {
            ...props,
            state: fulfilled,
            memo: props.status === "Fulfilled" ? props.memo || `[Info] Request.Submit: Request exists; was fulfilled; updated and settled` : props.memo,
          });
          return result ? result : undefined;
        }

        //-- pending requests can be updated but not resubmitted; WIP: resubmission logic possibly 'hold' state?
        if (current.status === "Pending") {
          if (props.update_time! > current.update_time!) {
            await publish(current, { ...props });
            return current.request;
          } else if (props.update_time! < current.update_time!) {
            const hold = await States.Key<IRequestState>({ status: "Hold" });
            const result = await publish(current, {
              ...props,
              state: hold,
              memo: props.status === "Hold" ? props.memo || `[Info] Request.Submit: Request exists; was put on hold; pending cancel and resubmit` : props.memo,
            });
            return result ? result : undefined;
          } else return undefined;
        }

        console.log(">> [Error] Request.Submit: Request exists; unauthorized resubmission; request rejected");
        return undefined;
      } else {
          const result = await publish({}, {
            ...props,
            memo: props.memo || `[Warning] Request.Submit: Request missing; was added locally; updated and settled`,
          });
          return result ? result : undefined;
      }
    } 

    // Handle new request submission
    const current: Partial<IRequest> = {};
    const result = await InstrumentPosition.Fetch({ instrument_position: props.instrument_position });

    if (result) {
      const [position] = result;

      position.auto_status === "Enabled" &&
        (async () => {
          const pending = await Orders.Fetch({ instrument_position: props.instrument_position, status: "Pending" });
          pending &&
            pending.forEach(({ request }) => {
              Cancel({ request, memo: `[Auto-Cancel]: New request for instrument/position auto-cancels existing open request` });
            });

          const queued = await Orders.Fetch({ instrument_position: props.instrument_position, status: "Queued" });
          queued &&
            queued.forEach(({ request }) => {
              Close({ request, memo: `[Auto-Close]: New request for instrument/position auto-closes existing queued request` });
            });
        })();
    }

    const request = await publish(current, props);
    return request;
  } else {
    console.log(">> [Error] Request.Submit: Invalid request; missing instrument position; request rejected");
    return undefined;
  }
};
