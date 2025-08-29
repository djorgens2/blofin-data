//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "@api/requests";
import type { IOrderAPI } from "@api/orders";
import type { IOrder } from "@db/interfaces/order";
import type { IRequestState, TRequest } from "@db/interfaces/state";

import { Modify, Select, parseColumns } from "@db/query.utils";
import { uniqueKey, hexify } from "@lib/crypto.util";
import { isEqual, setExpiry } from "@lib/std.util";
import { Session } from "@module/session";

import * as RequestAPI from "@api/orders";
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
  const formatted = {
    request: request.request ? request.request : hexify(uniqueKey(10), 6),
    account: Session().account,
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
//| Formats request for publication to local db;                                         |
//+--------------------------------------------------------------------------------------+
const compare = async (compare: Partial<IRequest>): Promise<[Partial<IOrderAPI>, Partial<IRequest>]> => {
  const { request, account } = compare;
  const [order] = await Order.Fetch({ request, account });
  const [local] = await Fetch({ request, account });
  const cancel: Partial<IOrderAPI> = {};
  const submit: Partial<IRequest> = {};

  compare.position && local.position !== compare.position! && (submit.position = compare.position);
  compare.action && local.action !== compare.action! && (submit.action = compare.action);
  compare.margin_mode && local.margin_mode !== compare.margin_mode! && (submit.margin_mode = compare.margin_mode);
  compare.broker_id && local.broker_id !== compare.broker_id! && (submit.broker_id = compare.broker_id);

  compare.instrument && !isEqual(local.instrument!, compare.instrument) && (submit.instrument = compare.instrument);
  compare.price && !isEqual(local.price!, compare.price) && (submit.price = compare.price);
  compare.size && !isEqual(local.size!, compare.size) && (submit.size = compare.size);
  compare.leverage && !isEqual(local.leverage!, compare.leverage) && (submit.leverage = compare.leverage);
  compare.request_type && !isEqual(local.request_type!, compare.request_type) && (submit.request_type = compare.request_type);

  compare.reduce_only && !!compare.reduce_only !== !!local.reduce_only! && (submit.reduce_only = compare.reduce_only);

  if (order && Object.keys(submit).length) {
    console.log(">> [Warning: Request.Compare] Order modified; canceled and resubmitted", { order, local, compare, submit });
    Object.assign(cancel, { instId: local.symbol, orderId: local.order_id!.toString, memo: `[Compare]: Order modified; canceled and resubmitted` });
  }

  compare.state && !isEqual(local.state!, compare.state) && (submit.state = compare.state);
  compare.memo && !isEqual(local.memo!, compare.memo) && (submit.memo = compare.memo);
  compare.expiry_time && local.expiry_time! !== compare.expiry_time && (submit.expiry_time = compare.expiry_time);

  return [cancel, submit];
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
const update = async (update: Partial<IRequest>): Promise<Partial<IRequest> | undefined> => {
  const { request, account, create_time, update_time, ...updates } = await formatRequest(update);
  const [cancel, submit] = await compare({ ...updates, request, account });

  if (Object.keys(submit).length) {
    if (Object.keys(cancel).length) {
      const [accepted] = await RequestAPI.Cancel([cancel]);

      if (accepted.length) {
        console.log(">> [Info: Request.Update] Order modified; request canceled and resubmitted", { cancel, submit });
        const request = await Submit({ ...updates, account, memo: `[Update]: Order modified; request canceled and resubmitted` });
        return { request, account, ...updates, memo: `[Update]: Order modified; request canceled and resubmitted` };
      } else {
        updates.state = await States.Key({ status: "Rejected" });
        updates.memo = `[Update]: Unable to cancel modified order; request rejected`;
        console.log(">> [Error: Request.Update] Unable to cancel modified order; request rejected", update);
      }
    }

    const [fields, args] = parseColumns(updates);
    const sql = `UPDATE blofin.request SET ${fields.join(", ")}, update_time = now(3) WHERE request = ? AND account = ?`;
    args.push(request, account);

    try {
      await Modify(sql, args);
      return { request, account, ...updates, memo: `[Update]: Request updated successfully` };
    } catch (e) {
      console.log({ sql, args, update });
      console.log(e);
      return { request, account, ...updates, memo: `[Update]: Error updating request` };
    }
  } else {
    console.log(">> [Warning: Request.Update] No updates to apply", update);
    return { request, account, ...updates, create_time, update_time, memo: `[Update]: No updates to apply` };
  }
};

//-- Public functions

//+--------------------------------------------------------------------------------------+
//| Reconciles changes triggered via diffs between local db and broker;                  |
//+--------------------------------------------------------------------------------------+
export const Audit = async (): Promise<Array<Partial<IOrder>>> => {
  const audit = await Select<IOrder>(`SELECT * FROM blofin.vw_orders WHERE account = ? AND state != request_state`, [Session().account]);

  if (audit.length) {
    console.log(`In Request.Audit [${audit.length}]`);
    for (const item of audit)
      await Submit({ ...item, order_state: item.order_state, memo: `[Audit]: Request State updated from ${item.status} to ${item.request_status}` });
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
export const Cancel = async (cancel: Partial<IRequest>): Promise<Array<Partial<IRequest>> > => {
  const { request, account, memo } = cancel;
  const cancels: Array<Partial<IRequest>> = [];

  if (request && account)
    if (isEqual(account, Session().account!)) {
      const canceled = await update({ request, status: "Canceled", memo: memo || `[Cancel]: Request canceled by user/system` });
      return canceled ? [canceled] : [];
    } else {
      console.log(">> [Error: Request.Cancel] Unauthorized cancel attempt; account mismatch", { cancel, session: Session() });
      return [];
    }

  const requests = await Fetch({ ...cancel, account: Session().account });
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
  if (submission.account && !isEqual(submission.account!, Session().account!)) {
    console.log(">> [Error: Request.Submit] Request.Submit] Unauthorized submit attempt; account mismatch", {
      submission,
      session: Session().account,
      alias: Session().alias,
    });
    return undefined;
  }

  const queued = await States.Key<IRequestState>({ status: "Queued" });
  const state = await Order.State({ order_state: submission.order_state });
  const submit = await formatRequest({ ...submission, state: state || queued, expiry_time: submission.expiry_time || setExpiry("8h") });

  if (submission.request) {
    const [exists] = await Fetch({ request: submit.request });
    if (exists) {
      const { request, status, create_time, expiry_time } = exists;
      if (status === "Canceled") {
        console.log(">> [Warning: Request.Submit] Request exists; was canceled and not resubmitted:", { exists, submit });
        return undefined;
      }
      if (status === "Rejected") {
        console.log(">> [Error: Request.Submit] Request exists; was previously rejected and resubmitted:", { exists, submit });
        await update({ request, ...submit, create_time: exists.create_time, memo: `[SUB] Request replaced; prior reject resubmitted` });
        return request;
      }
      if (status === "Queued") {
        console.log(">> [Info: Request.Submit] Request exists; was unprocessed; updated and resubmitted:", { exists, submit });
        await update({
          request,
          ...submit,
          create_time,
          expiry_time,
          memo: submit.memo || `[SUB] Request replaced; unprocessed request updated and resubmitted`,
        });
        return request;
      }
      if (status === "Pending") {
        console.log(">> [Error: Request.Submit] Request exists; is pending and not resubmitted:", { exists, submit });
        await update({
          request,
          ...submit,
          create_time,
          expiry_time,
          memo: submit.memo || `[SUB] Request replaced; unprocessed request updated and resubmitted`,
        });
        return undefined;
      }

      console.log(">> [Error: Request.Submit] Request exists; unauthorized resubmission", { exists, submit });
      return undefined;
    }
  }

  const [auto] = await InstrumentPosition.Fetch({ symbol: submit.symbol, position: submit.position, status: "Open", auto_status: "Enabled" });

  if (auto)
    if (auto.open_request && submit.create_time! > auto.create_time!) {
      const pending = await Fetch({ instrument: submit.instrument, position: submit.position, status: "Pending", account: Session().account });
      if (pending.length)
        for (const { request } of pending)
          await Cancel({ request: request!, memo: `[Auto-Cancel]: New request for instrument/position auto-cancels existing open request` });
    }

  const request = await publish(submit);
  return request;
};
