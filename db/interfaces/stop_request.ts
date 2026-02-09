//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState, TRequestState } from "db/interfaces/state";
import type { IStopOrder } from "db/interfaces/stops";
import type { IPublishResult } from "db/query.utils";
import type { TRefKey } from "./reference";

import { Insert, Update, PrimaryKey } from "db/query.utils";
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
  trigger_price: number;
  order_price: number;
  reduce_only: boolean;
  memo: string;
  broker_id: string;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Publishes application generated auto stop requests and updates locally;              |
//+--------------------------------------------------------------------------------------+
export const Publish = async (source: string, current: Partial<IStopOrder>, props: Partial<IStopOrder>): Promise<IPublishResult<IStopOrder>> => {
  if (hasValues<Partial<IStopOrder>>(current)) {
    if (hasValues<Partial<IStopOrder>>(props)) {
      const update_time = props.update_time || new Date();
      const state = (await States.Key<IRequestState>({ status: props.status })) ?? props.state;

      if (update_time > current.update_time!) {
        // 1. Build the core diff
        const revised: Partial<IStopOrder> = {};

        if (!isEqual(props.size!, current.size!)) revised.size = props.size;
        if (!isEqual(props.trigger_price!, current.trigger_price!)) revised.trigger_price = props.trigger_price;
        if (!isEqual(props.order_price!, current.order_price!)) revised.order_price = props.order_price;
        if (state && props.status !== "Hold" && !isEqual(state, current.state!)) revised.state = state;

        // Handle boolean specifically to avoid undefined vs false confusion
        if (props.reduce_only !== undefined && !!props.reduce_only !== !!current.reduce_only) {
          revised.reduce_only = !!props.reduce_only;
        }

        // 2. ONLY if a core field changed, attach the metadata and fire the update
        if (Object.keys(revised).length > 0) {
          revised.stop_request = props.stop_request; // Required for PKey
          revised.stop_type = props.stop_type; // Required for PKey
          revised.update_time = update_time; // Stamp the change
          revised.memo = props.memo || current.memo || "[Info] Stop.Request.Publish: Updated stop request";
          revised.state = props.status === "Hold" ? await States.Key<IRequestState>({ status: "Hold" }) : state; // Special Case: Auto-correction for 'Hold'

          const result = await Update(revised, {
            table: `stop_request`,
            keys: [{ key: `stop_request` }, { key: `stop_type` }],
            context: "Stop.Request.Publish",
          });

          return {
            key: PrimaryKey(current, [`stop_request`, `stop_type`]),
            response: result,
          };
        }
      }

      // 3. If we reached here, it was either stale (update_time) or a non-op (no core diff)
      return {
        key: PrimaryKey(current, [`stop_request`, `stop_type`]),
        response: {
          success: true,
          code: 200,
          response: `exists`,
          message: `Stop request unchanged`,
          rows: 0,
          context: "Stop.Request.Publish",
        },
      };
    }

    return {
      key: PrimaryKey(current, [`stop_request`, `stop_type`]),
      response: {
        success: false,
        code: 400,
        response: `null_query`,
        message: `[Error] Stop Request: No update properties provided from ${source}; stop request unchanged`,
        rows: 0,
        context: `Stop.Request.Publish.${source}`,
      },
    };
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
      trigger_price: props.trigger_price,
      order_price: props.order_price,
      reduce_only: props.reduce_only !== undefined ? !!props.reduce_only : undefined,
      memo: props.memo || "[Info] Stop.Request.Publish: Initialized",
      create_time: props.create_time,
    };

    const result = await Insert<Partial<IStopRequest>>(
      { ...request, update_time: request.create_time },
      { table: "stop_request", context: "Stop.Request.Publish" },
    );
    return {
      key: PrimaryKey(request, [`stop_request`, `stop_type`]),
      response: result,
    };
  }

  return {
    key: undefined,
    response: {
      success: false,
      code: 400,
      response: `null_query`,
      message: "[Error] Stop.Request.Publish: Nothing to publish",
      rows: 0,
      context: `Stop.Request.Publish.${source}`,
    },
  };
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
  return cancels;
};

//+--------------------------------------------------------------------------------------+
//| Submits application (auto) stop requests locally on Open positions;                  |
//+--------------------------------------------------------------------------------------+
export const Submit = async (props: Partial<IStopRequest>): Promise<IPublishResult<IStopRequest>> => {
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
    }

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
