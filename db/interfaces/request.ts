//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "@api/requests";
import type { IOrder } from "@db/interfaces/order";
import type { IRequestState, TRequest } from "@db/interfaces/state";

import { Modify, Select, parseColumns } from "@db/query.utils";
import { Session } from "@module/session";
import { uniqueKey, hexify } from "@lib/crypto.util";
import { setExpiry } from "@lib/std.util";

import * as Order from "@db/interfaces/order";
import * as States from "@db/interfaces/state";
import * as References from "@db/interfaces/reference";
import * as Instruments from "@db/interfaces/instrument";
import * as InstrumentPosition from "@db/interfaces/instrument_position";

export interface IRequest {
  request: Uint8Array;
  order_id: number;
  client_order_id: string | undefined;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  state: Uint8Array;
  status: TRequest;
  order_state: Uint8Array;
  order_status: TRequest;
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
  create_time: Date | number;
  expiry_time: Date | number;
  update_time: Date | number;
}

//-- Private functions

//+--------------------------------------------------------------------------------------+
//| Formats request for publication to local db;                                         |
//+--------------------------------------------------------------------------------------+
const formatRequest = async (request: Partial<IRequest>): Promise<Partial<IRequest>> => {
  const { account } = Session();
  const formatted = {
    request: request.request ? request.request : hexify(uniqueKey(10), 6),
    account,
    instrument: request.instrument || (await Instruments.Key({ symbol: request.symbol })),
    position: request.position,
    action: request.action,
    state: request.state || (await States.Key({ status: request.status })),
    price: request.price,
    size: request.size,
    leverage: request.leverage,
    request_type: request.request_type || (await References.Key<Uint8Array>("request_type", { source_ref: request.order_type })),
    margin_mode: request.margin_mode,
    reduce_only: request.reduce_only && (!!request.reduce_only || false),
    broker_id: request.broker_id,
    memo: request.memo,
    create_time: request.create_time && new Date(request.create_time),
    update_time: new Date(Date.now()),
    expiry_time: request.expiry_time,
  } as Partial<IRequest>;

  return formatted;
};

//+--------------------------------------------------------------------------------------+
//| Publishes new requests from all sources; API/WSS/APP/CLI and SQL Clients             |
//+--------------------------------------------------------------------------------------+
const publish = async (request: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const [fields, args] = parseColumns(request, "");
  const sql = `INSERT INTO blofin.request ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")})`;

  try {
    await Modify(sql, args);
    return request.request;
  } catch (e) {
    console.log({ sql, args, request });
    console.log(e);
    return undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Applies updates to request on select columns;                                        |
//+--------------------------------------------------------------------------------------+
const update = async (update: Partial<IRequest>) => {
  const { request, create_time, ...updates } = await formatRequest(update);
  const [fields, args] = parseColumns(updates);
  const sql = `UPDATE blofin.request SET ${fields.join(", ")}, update_time = now(3) WHERE request = ?`;

  args.push(request);

  try {
    await Modify(sql, args);
    return { ...updates, request, memo: `[Update]: Request updated successfully` };
  } catch (e) {
    console.log({ sql, args, update });
    console.log(e);
    return { ...updates, request, memo: `[Update]: Error updating request` };
  }
};

//-- Public functions

//+--------------------------------------------------------------------------------------+
//| Reconciles changes triggered via diffs between local db and broker;                  |
//+--------------------------------------------------------------------------------------+
export const Audit = async (): Promise<Array<Partial<IOrder>>> => {
  const audit = await Select<IOrder>(`SELECT * FROM blofin.vw_orders WHERE state != request_state`, []);

  if (audit.length) {
    console.log(`In Request.Audit [${audit.length}]`);
    for (const item of audit) await Submit({ ...item, order_state: item.order_state, memo: `[Audit]: Request State updated from ${item.status} to ${item.request_status}` });
  }
  return audit;
};

//+--------------------------------------------------------------------------------------+
//| Returns filtered requests from the db for processing/synchronization with broker;    |
//+--------------------------------------------------------------------------------------+
export const Queue = async (props: Partial<IRequestAPI>): Promise<Array<Partial<IRequestAPI>>> => {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_api_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;

  return Select<IRequestAPI>(sql, args);
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IRequest>): Promise<Array<Partial<IRequest>>> => {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;

  return Select<IRequest>(sql, args);
};

//+--------------------------------------------------------------------------------------+
//| Fetches a request key from local db that meet props criteria; notfound returns undef |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT request FROM blofin.vw_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;

  try {
    const key = await Select<IRequest>(sql, args);
    return key.length === 1 ? key[0].request : undefined;
  } catch (e) {
    console.log({ sql, args, props });
    console.log(e);
    return undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Cancels requests in local db meeting criteria; initiates cancel to broker;           |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (cancel: Partial<IRequest>) => {
  const { request, memo } = cancel;
  const cancels: Array<Partial<IRequest>> = [];
  
  if (request) {
    const canceled = await update({ request, status: "Canceled", memo: memo || `[Cancel]: Request canceled by user/system` });
    return canceled ? [canceled] : [];
  }

  const requests = await Fetch(cancel);
  for (const request of requests) {
    const canceled = await update({ request: request.request, status: "Canceled", memo: memo || `[Cancel]: Request canceled by user/system` });
    canceled && cancels.push(canceled);
  }

  return cancels;
};

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (submission: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const queued = await States.Key<IRequestState>({ status: "Queued" });
  const state = await Order.State({ order_state: submission.order_state });
  const submit = await formatRequest({ ...submission, state: state || queued, expiry_time: submission.expiry_time || setExpiry("8h") });

  if (submission.request) {
    const [exists] = await Fetch({ request: submit.request });
    if (exists) {
      const {request, status, create_time, expiry_time} = exists;
      if (status === "Canceled") {
        console.log("Request exists; was canceled and not resubmitted:", { exists, submit });
        return undefined;
      }
      if (status === "Rejected") {
        console.log("Request exists; was previously rejected and resubmitted:", { exists, submit });
        await update({ request, ...submit, create_time: exists.create_time, memo: `[SUB] Request replaced; prior reject resubmitted` });
        return request;
      }
      if (status === "Queued") {
        console.log("Request exists; was unprocessed; updated and resubmitted:", { exists, submit });
        await update({ request, ...submit, create_time, expiry_time, memo: submit.memo || `[SUB] Request replaced; unprocessed request updated and resubmitted` });
        return request;
      }
      if (status === "Pending") {
        console.log("Request exists; is pending and not resubmitted:", { exists, submit });
        await update({ request, ...submit, create_time, expiry_time, memo: submit.memo || `[SUB] Request replaced; unprocessed request updated and resubmitted` });
        return undefined;
      }

      console.log("Request exists; unauthorized resubmitssion", { exists, submit });
      return undefined;
    }
  }

  const [auto] = await InstrumentPosition.Fetch({ symbol: submit.symbol, position: submit.position, status: "Open", auto_status: "Enabled" });

  if (auto)
    if (auto.open_request && submit.create_time! > auto.create_time!) {
      const pending = await Fetch({ instrument: submit.instrument, position: submit.position, status: "Pending" });
      if (pending.length)
        for (const { request } of pending)
          await Cancel({ request: request!, memo: `[Auto-Cancel]: New request for instrument/position auto-cancels existing open request` });
    }

  const request = await publish(submit);
  return request;
};
