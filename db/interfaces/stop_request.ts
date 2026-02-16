//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState, TRequestState } from "db/interfaces/state";
import type { IStopOrder } from "db/interfaces/stops";
import type { IPublishResult } from "api";
import type { TRefKey } from "db/interfaces/reference";

import { Select, Insert, Update } from "db/query.utils";
import { PrimaryKey } from "api";
import { hexify, uniqueKey } from "lib/crypto.util";
import { Session } from "module/session";
import { hasValues, isEqual } from "lib/std.util";
import { ApiError } from "api/api.util";

import * as Stops from "db/interfaces/stops";
import * as States from "db/interfaces/state";
import * as Reference from "db/interfaces/reference";
import * as InstrumentPosition from "db/interfaces/instrument_position";

export interface IStopRequest {
  account: Uint8Array;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  stop_request: Uint8Array;
  stop_type: Uint8Array;
  stop_request_type: string;
  state: Uint8Array;
  status: TRequestState;
  position: "short" | "long" | "net";
  action: "buy" | "sell";
  margin_mode: "cross" | "isolated";
  size: number;
  tp_trigger_price: number;
  tp_order_price: number;
  sl_trigger_price: number;
  sl_order_price: number;
  reduce_only: boolean;
  memo: string;
  broker_id: string;
  create_time: Date;
  update_time: Date;
}

export interface IStopType {
  stop_type: Uint8Array;
  source_ref: string;
  prefix: string;
  description: string;
}

export interface IStopPrice {
  stop_request: Uint8Array;
  stop_type: Uint8Array;
  trigger_price: number;
  order_price: number;
}

//+--------------------------------------------------------------------------------------+
//| Fetches stop types from local db;                                                    |
//+--------------------------------------------------------------------------------------+
const stop_types = async (props: ["tp", "sl"]): Promise<Array<Partial<IStopType>>> => {
  const types = props
    ? (
        await Promise.all(
          props.map((p) => {
            return Select<IStopType>({ source_ref: p }, { table: `stop_type` });
          }),
        )
      ).flat()
    : [];
  return types;
};

//+--------------------------------------------------------------------------------------+
//| Fetches the Stop Price array from local db that meet props criteria;                 |
//+--------------------------------------------------------------------------------------+
const price = async (stop_request: IStopPrice["stop_request"]): Promise<Array<Partial<IStopPrice>> | undefined> => {
  const result = await Select<IStopPrice>({ stop_request }, { table: `stop_price` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Publishes application generated auto stop requests and updates locally;              |
//+--------------------------------------------------------------------------------------+
export const Publish = async (source: string, current: Partial<IStopOrder>, props: Partial<IStopOrder>): Promise<Array<IPublishResult<IStopOrder>>> => {
  const types = await stop_types(["tp", "sl"]);
  const typeMap = new Map(types.map((t) => [t.source_ref, t]));

  const tp = typeMap.get("tp");
  const sl = typeMap.get("sl");

  if (!tp || !sl) throw new ApiError(602, `Invalid stop type references requoired for TPSL publishing`);

  const stop_price = [];

  if (hasValues<Partial<IStopOrder>>(current)) {
    if (hasValues<Partial<IStopOrder>>(props)) {
      const update_time = props.update_time || new Date();
      const state = (await States.Key<IRequestState>({ status: props.status })) ?? props.state;

      if (update_time > current.update_time!) {
        // 1. Build the core diff

        const revised: Partial<IStopOrder> = {};

        (props.tp_trigger_price !== current.tp_trigger_price || props.tp_order_price !== current.tp_order_price) &&
          stop_price.push({
            stop_request: props.stop_request,
            stop_type: tp.stop_type,
            trigger_price: props.tp_trigger_price || -1,
            order_price: props.tp_order_price || -1,
          });

        (props.sl_trigger_price !== current.sl_trigger_price || props.sl_order_price !== current.sl_order_price) &&
          stop_price.push({
            stop_request: props.stop_request,
            stop_type: sl.stop_type!,
            trigger_price: props.sl_trigger_price || -1,
            order_price: props.sl_order_price || -1,
          });

        if (!isEqual(props.size!, current.size!)) revised.size = props.size;
        if (state && props.status !== "Hold" && !isEqual(state, current.state!)) revised.state = state;

        // 2. ONLY if a core field changed, attach the metadata and fire the update
        if (Object.keys(revised).length || stop_price.length) {
          revised.stop_request = props.stop_request; // Required for PKey
          revised.update_time = update_time; // Stamp the change
          revised.reduce_only = !!props.reduce_only;
          revised.memo = props.memo || current.memo || "[Info] Stop.Request.Publish: Updated stop request";
          revised.state = props.status === "Hold" ? await States.Key<IRequestState>({ status: "Hold" }) : state; // Special Case: Auto-correction for 'Hold'

          const [requestResult, priceResult] = await Promise.all([
            Update(revised, {
              table: `stop_request`,
              keys: [[`stop_request`]],
              context: "Stop.Request.Publish",
            }),
            Promise.all(
              stop_price.map(async (p) => {
                const result = await Update(p, {
                  table: `stop_price`,
                  keys: [[`stop_request`], [`stop_type`]],
                  context: "Stop.Price.Publish",
                });
                return {
                  key: PrimaryKey(p, [`stop_request`, `stop_type`]),
                  response: result,
                };
              }),
            ),
          ]);

          return [
            {
              key: PrimaryKey(current, [`stop_request`]),
              response: requestResult,
            },
            ...priceResult,
          ].flat();
        }
      }

      // 3. If we reached here, it was either stale (update_time) or a non-op (no core diff)
      return [
        {
          key: PrimaryKey(current, [`stop_request`, `stop_type`]),
          response: {
            success: true,
            code: 200,
            response: `exists`,
            message: `Stop request unchanged`,
            rows: 0,
            context: "Stop.Request.Publish",
          },
        },
      ];
    }

    return [
      {
        key: PrimaryKey(current, [`stop_request`, `stop_type`]),
        response: {
          success: false,
          code: 400,
          response: `null_query`,
          message: `[Error] Stop Request: No update properties provided from ${source}; stop request unchanged`,
          rows: 0,
          context: `Stop.Request.Publish.${source}`,
        },
      },
    ];
  }

  if (hasValues<Partial<IStopRequest>>(props)) {
    const query: Partial<IRequestState> = props.status ? { status: props.status } : props.state ? { state: props.state } : { status: "Queued" };
    const state = await States.Key<IRequestState>(query);
    const request: Partial<IStopRequest> = {
      stop_request: props.stop_request || hexify(uniqueKey(10), 5),
      stop_type: props.stop_type,
      instrument_position: props.instrument_position,
      state,
      margin_mode: props.margin_mode || Session().margin_mode || `cross`,
      action: props.action,
      size: props.size,
      reduce_only: props.reduce_only !== undefined ? !!props.reduce_only : undefined,
      memo: props.memo || "[Info] Stop.Request.Publish: Initialized",
      create_time: props.create_time,
      //-> fix this      update_time: props.create_time,
    };

    (!!props.tp_trigger_price || !!props.tp_order_price) &&
      stop_price.push({
        stop_request: props.stop_request,
        stop_type: tp.stop_type,
        trigger_price: props.tp_trigger_price || -1,
        order_price: props.tp_order_price || -1,
      });

    (!!props.sl_trigger_price || !!props.sl_order_price) &&
      stop_price.push({
        stop_request: props.stop_request,
        stop_type: sl.stop_type!,
        trigger_price: props.sl_trigger_price || -1,
        order_price: props.sl_order_price || -1,
      });

    const [requestResult, priceResult] = await Promise.all([
      await Insert(request, {
        table: `stop_request`,
        keys: [[`stop_request`]],
        context: "Stop.Request.Publish",
      }),
      Promise.all(
        stop_price.map(async (p) => {
          const result = await Insert(p, {
            table: `stop_price`,
            context: "Stop.Price.Publish",
          });
          return {
            key: PrimaryKey(p, [`stop_request`, `stop_type`]),
            response: result,
          };
        }),
      ),
    ]);

    return [
      {
        key: PrimaryKey(current, [`stop_request`]),
        response: requestResult,
      },
      ...priceResult,
    ].flat();
  }

  return [
    {
      key: undefined,
      response: {
        success: false,
        code: 400,
        response: `null_query`,
        message: "[Error] Stop.Request.Publish: Nothing to publish",
        rows: 0,
        context: `Stop.Request.Publish.${source}`,
      },
    },
  ];
};

//+--------------------------------------------------------------------------------------+
//| Cancels requests in local db meeting criteria; initiates cancel to broker;           |
//+--------------------------------------------------------------------------------------+
export const Cancel = async (props: Partial<IStopRequest>): Promise<Array<IPublishResult<IStopRequest>>> => {
  const orders = await Stops.Fetch(props.stop_request ? { stop_request: props.stop_request } : props);

  if (!orders) {
    console.log("[Error]: Unauthorized cancellation attempt");
    return [
      {
        key: undefined,
        response: {
          success: false,
          code: 400,
          response: `null_query`,
          message: "[Error] Request.Cancel: Nothing to cancel",
          rows: 0,
          context: "Request.Cancel",
        },
      },
    ];
  }
  const cancels = await Promise.all(
    orders.map(async (order) => {
      const result = await Publish(`Cancel`, order, {
        ...order,
        status: order.status === "Pending" ? "Canceled" : "Closed",
        memo: props.memo || `[Cancel]: Stop Request ${props.stop_request} canceled by user/system`,
        update_time: new Date(),
      });
      return result;
    }),
  );
  return cancels.flat();
};

//+--------------------------------------------------------------------------------------+
//| Submits application (auto) stop requests locally on Open positions;                  |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IStopRequest>): Promise<Array<IPublishResult<IStopRequest>>> => {
  if (!props.instrument_position || !((props.account || Session().account) && props.symbol && props.position)) {
    throw new ApiError(455, "Malformed Stop Request: Missing required identification details");
  }

  try {
    const query = props.instrument_position
      ? { instrument_position: props.instrument_position }
      : { account: props.account || Session().account, symbol: props.symbol, position: props.position };

    const [stop_position, stop_type] = await Promise.all([
      InstrumentPosition.Fetch(query),
      Reference.Key<TRefKey>({ source_ref: props.stop_request_type }, { table: `stop_type` }),
    ]);

    if (!stop_position || !stop_type) throw new ApiError(604, `System Configuration: Authorization or configuration failure`);

    const [{ instrument_position, open_request, open_take_profit, open_stop_loss }] = stop_position;
    const requests = await Stops.Fetch(
      { instrument_position, stop_type },
      { suffix: `AND status IN ("Pending", "Queued", "Rejected") ORDER BY status, update_time DESC` },
    );

    const submittable = stop_position.some((pos) => pos.status === "Open" && pos.auto_status === "Enabled");
    const latest = requests?.[0];
    const getBacklog = () => {
      if (submittable) {
        return requests || [];
      }
      return requests?.slice(1) || [];
    };

    // --- CRITICAL BUSINESS RULES: BACKLOG PURGE ---
    const backlog = getBacklog();
    if (backlog.length > 0) {
      await Promise.all(
        backlog.map(async (r) => {
          if (r.status === "Pending") {
            return Cancel({ stop_request: r.stop_request, memo: "[Auto] Purged Pending: Replaced by new request" });
          }
          if (r.status === "Queued") {
            // Move to Canceled state locally (assuming your 'Cancel' helper handles local-only if no broker ID)
            return Publish("Submit", r, { status: "Closed", memo: "[Auto] Closed Queued: Replaced by new request" });
          }
          if (r.status === "Rejected") {
            // Mark as Expired to clear the UI/Audit
            return Publish("Submit", r, { status: "Expired", memo: "[Auto] Expired Rejected: Cleanup" });
          }
        }),
      );
    }

    // If the new request is not submittable, we still want to update the existing request(s) to reflect the current state and inform the user
    // Need to handle results of backlog purge before deciding to throw error or proceed with submission
    if (!submittable) {
      throw new ApiError(456, `Stop Request Submission Denied: No open position or existing stop request`);
    }

    if (!latest) {
      return await Publish(
        "Submit",
        {},
        {
          ...props,
          instrument_position,
          stop_type,
          status: "Queued",
          memo: props.memo || `[Info] Stops.Submit: Stop Request submitted`,
        },
      );
    }

    const status = latest.status === "Pending" ? "Hold" : "Queued";

    return await Publish("Submit", latest, {
      ...props,
      instrument_position,
      stop_type,
      status,
      memo: props.memo || `[Warning] Stops.Submit: Stop Request exists; updated and resubmitted`,
    });
  } catch (error) {
    console.log("-> [Error] Stop.Request.Submit:", error);
    throw error;
  }
};
