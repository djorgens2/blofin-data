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
  expiry_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Reconciles changes triggered via diffs between local db and broker;                  |
//+--------------------------------------------------------------------------------------+
export const Audit = async (): Promise<Array<Partial<IOrder>>> => {
  const audit = await Select<IOrder>(`SELECT * FROM blofin.vw_orders WHERE state != request_state`, []);
  const items: Array<Partial<IRequest>> = [];

  if (audit.length) {
    for (const item of audit) {
      const { request, request_state, status, request_status } = item;
      items.push({ request, state: request_state, memo: `Audit: Request state changed from ${status} to ${request_status}` });
    }
  }
  await Update(items);
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
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IRequest>): Promise<IRequest["request"] | undefined> => {
  const { account } = Session();
  const [fields, args] = parseColumns(
    {
      request: props.request ? props.request : hexify(uniqueKey(10), 6),
      account,
      instrument: props.instrument || (await Instruments.Key({ symbol: props.symbol })),
      position: props.position,
      action: props.action,
      state: props.state || (await States.Key<IRequestState>({ status: "Queued" })),
      price: props.price,
      size: props.size,
      leverage: props.leverage,
      request_type: props.request_type || (await References.Key<Uint8Array>("request_type", { source_ref: props.order_type })),
      margin_mode: props.margin_mode,
      reduce_only: props.reduce_only || false,
      broker_id: props.broker_id,
      memo: props.memo,
      expiry_time: props.expiry_time || setExpiry("8h"), //-- set expiry time 8h if not provided; s/b set in configuration
    } as Partial<IRequest>,
    ""
  );

  const sql = `INSERT INTO blofin.request ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")})`;

  try {
    await Modify(sql, args);
    console.log("Request submitted successfully:", { ...props, request: args[0] });
  } catch (e) {
    console.log({ sql, args, props });
    console.log(e);
    return undefined;
  }

  return args[0] as IRequest["request"];
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

  if (cancels && cancels.length) {
    cancels.map((cancel) =>
      requests.push({
        request: cancel.request,
        status: "Canceled",
        memo: `Cancel: Request state changed from ${cancel.status} to Canceled`,
      })
    );

    try {
      console.log("Requests to cancel:", requests);
      const updated = await Update(requests);
      return updated;

    } catch (e) {
      console.log("Error during request cancellation:", e);
      console.log("Request details:", requests);
      return {updated: [], errors: requests};
    }
  }
  
  console.error("Test 1: No requests found to cancel with the provided criteria.");
  return {updated: [], errors: request as Array<Partial<IRequest>>};
};

//+--------------------------------------------------------------------------------------+
//| Updates the request states via WSS or API;                                           |
//+--------------------------------------------------------------------------------------+
export const Update = async (updates: Array<Partial<IRequest>>) => {
  const updated: Array<Partial<IRequest>> = [];
  const errors: Array<Partial<IRequest>> = [];

  if (updates.length) {
    for (const update of updates) {
      const { request, status, memo } = update;
      const state = update.state || (await States.Key<IRequestState>({ status }));
      const sql = `UPDATE blofin.request SET state = ?, memo = ? WHERE request = ?`;
      const args = [state, memo, request];

      try {
        await Modify(sql, args);
        updated.push({ request, status, memo });
      } catch (e) {
        console.log({ sql, args, update });
        console.log(e);
        errors.push({ request, status });
      }
    }
  }
  return { updated, errors };
};
