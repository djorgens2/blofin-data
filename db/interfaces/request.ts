//+---------------------------------------------------------------------------------------+
//|                                                                            request.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "@api/requests";
import type { IOrder } from "@db/interfaces/order";
import type { IRequestState, TRequest } from "@db/interfaces/state";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { Session } from "@module/session";
import { uniqueKey, hexify } from "@lib/crypto.util";
import { setExpiry } from "@lib/std.util";

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
//| Applies updates to request on select columns;                                        |
//+--------------------------------------------------------------------------------------+
const updateRequest = async (update: Partial<IRequest>) =>{
  const { request, create_time, update_time, ...updates } = update;
  const [fields, args] = parseColumns(updates);
  const sql = `UPDATE blofin.request SET ${fields.join(", ")}, update_time = now() WHERE request = ?`;

  args.push(request);

  try {
    await Modify(sql, args);
    return { ...updates, request, memo: `Request updated successfully` };
  } catch (e) {
    console.log({ sql, args, update });
    console.log(e);
    return { ...updates, request, memo: `Error updating request` };
  }
}

//+--------------------------------------------------------------------------------------+
//| Publishes new requests from all sources; API/WSS/APP/CLI and SQL Clients             |
//+--------------------------------------------------------------------------------------+
const publishRequest = async (request: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const [fields, args] = parseColumns(request, "");
  const sql = `INSERT INTO blofin.request ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")})`;

  try {
    await Modify(sql, args);
    console.log("Request submitted successfully:", request);
    return request.request;
  } catch (e) {
    console.log({ sql, args, request });
    console.log(e);
    return undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Returns formatted, validated, and keyed supplied request;                            |
//+--------------------------------------------------------------------------------------+
const formatRequest = async (request: Partial<IRequest>): Promise<Partial<IRequest>> => {
  const { account } = Session();
  return {
    request: request.request ? request.request : hexify(uniqueKey(10), 6),
    account,
    instrument: request.instrument || (await Instruments.Key({ symbol: request.symbol })),
    position: request.position,
    action: request.action,
    state: request.state || (await States.Key<IRequestState>({ status: "Queued" })),
    price: request.price,
    size: request.size,
    leverage: request.leverage,
    request_type: request.request_type || (await References.Key<Uint8Array>("request_type", { source_ref: request.order_type })),
    margin_mode: request.margin_mode,
    reduce_only: request.reduce_only || false,
    broker_id: request.broker_id,
    memo: request.memo,
    create_time: request.create_time || Date.now(),
    update_time: request.update_time || Date.now(),
    expiry_time: request.expiry_time || setExpiry("8h"), //-- set expiry time 8h if not provided; s/b set in configuration
  } as Partial<IRequest>;
};

//-- Public functions

//+--------------------------------------------------------------------------------------+
//| Reconciles changes triggered via diffs between local db and broker;                  |
//+--------------------------------------------------------------------------------------+
export const Audit = async (): Promise<Array<Partial<IOrder>>> => {
  const audit = await Select<IOrder>(`SELECT * FROM blofin.vw_orders WHERE state != request_state`, []);
  const items: Array<Partial<IRequest>> = [];

  if (audit.length) for (const item of audit) await updateRequest(item);

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
//| Fetches requests from local db that meet props criteria;                             |
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
export const Cancel = async (request: Partial<IRequest>) => {
  const cancels = await Fetch(request);
  const requests: Array<Partial<IRequest>> = [];
  const updated: Array<Partial<IRequest>> = [];
  const errors: Array<Partial<IRequest>> = [];

  if (cancels && cancels.length) {
    cancels.map((cancel) =>
      requests.push({
        request: cancel.request,
        status: "Canceled",
        memo: `Cancel: Request state changed from ${cancel.status} to Canceled`,
      })
    );
  }

  if (requests.length) {
    console.log("Requests to cancel:", requests);

    for (const request of requests) {
      try {
        await updateRequest(request);
        updated.push(request);
      } catch (e) {
        return { updated, errors: requests };
      }
    }
  }

  return { updated, errors: [] as Array<Partial<IRequest>> };
};

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (submission: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const submit = await formatRequest(submission);

  if (submission.request) {
    const exists = await Key({ request: submit.request });
    if (exists) {
      await updateRequest({ ...submit, memo: `Request exists and resubmitted; check db for modifications` });
      console.log("Request already exists; updated and resubmitted:", exists);
      return exists;
    }
  }

  const [auto] = await InstrumentPosition.Fetch({ symbol: submit.symbol, position: submit.position, status: "Open", auto_status: "Enabled" });

  if (auto)
    if (auto.open_request && auto.create_time! < submit.create_time!) 
      await Cancel({ instrument: submit.instrument, position: submit.position, status: "Pending" });

  const request = await publishRequest(submit);
  return request;
};
