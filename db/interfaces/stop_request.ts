//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState, TRequestState } from "db/interfaces/state";
import type { IStopOrder } from "db/interfaces/stops";
import type { IPublishResult } from "db/query.utils";

import { Select, Insert, Update, TOptions, PrimaryKey } from "db/query.utils";
import { hexify, uniqueKey } from "lib/crypto.util";
import { Session } from "module/session";
import { hasValues, isEqual } from "lib/std.util";

import * as InstrumentPosition from "db/interfaces/instrument_position";
import * as Stops from "db/interfaces/stops";
import * as States from "db/interfaces/state";

export interface IStopRequest {
  account: Uint8Array;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  stop_request: Uint8Array;
  stop_type: Uint8Array;
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
      const state = props.status === "Hold" ? undefined : (await States.Key<IRequestState>({ status: props.status })) || props.state || current.state;

      if (update_time > current.update_time!) {
        const revised: Partial<IStopOrder> = {
          stop_request: props.stop_request,
          stop_type: props.stop_type,
          state: isEqual(state!, current.state!) ? undefined : state,
          size: isEqual(props.size!, current.size!) ? undefined : props.size,
          trigger_price: isEqual(props.trigger_price!, current.trigger_price!) ? undefined : props.trigger_price,
          order_price: isEqual(props.order_price!, current.order_price!) ? undefined : props.order_price,
          reduce_only: props.reduce_only ? (!!props.reduce_only! === !!current.reduce_only! ? undefined : !!props.reduce_only) : undefined,
          create_time: isEqual(props.create_time!, current.create_time!) ? undefined : props.create_time,
        };

        const result = await Update(revised, { table: `stop_request`, keys: [{ key: `stop_request` }, { key: `stop_type` }], context: "Stop.Request.Publish" });

        if (result.success) {
          const state = props.status === "Hold" ? await States.Key<IRequestState>({ status: "Hold" }) : undefined;
          const confirm = await Update(
            { stop_request: props.stop_request, stop_type: props.stop_type, state, memo: props.memo === current.memo ? undefined : props.memo, update_time },
            {
              table: `stop_request`,
              keys: [{ key: `stop_request` }, { key: `stop_type` }],
              context: "Stop.Request.Publish",
            },
          );
          return { key: PrimaryKey(current, [`stop_request`, `stop_type`]), response: confirm };
        }
      }
      return {
        key: PrimaryKey(current, [`stop_request`, `stop_type`]),
        response: { success: false, code: 200, response: `exists`, message: `Stop request unchanged`, rows: 0, context: `Stop.Request.Publish` },
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
    const queued = await States.Key<IRequestState>({ status: "Queued" });
    const request: Partial<IStopRequest> = {
      stop_request: props.stop_request || hexify(uniqueKey(8), 4),
      stop_type: props.stop_type,
      instrument_position: props.instrument_position,
      state: props.state || queued,
      margin_mode: props.margin_mode || Session().margin_mode || `cross`,
      action: props.action,
      size: props.size,
      trigger_price: props.trigger_price,
      order_price: props.order_price,
      reduce_only: props.reduce_only ? (!!props.reduce_only! === !!current.reduce_only! ? undefined : !!props.reduce_only) : undefined,
      memo: props.memo || "[Info] Stop.Request.Publish: Stop request does not exist; proceeding with submission",
      create_time: props.create_time || new Date(),
    };

    const result = await Insert<Partial<IStopRequest>>({...request, update_time: request.create_time}, { table: "stop_request", context: "Stop.Request.Publish" });
    return { key: PrimaryKey(request, [`stop_request`, `stop_type`]), response: result };
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
export const Submit = async (props: Partial<IStopOrder>): Promise<IPublishResult<IStopRequest>> => {
  if (hasValues(props)) {
    const query = props.instrument_position
      ? { instrument_position: props.instrument_position }
      : { account: props.account || Session().account, symbol: props.symbol, position: props.position };
    const [result] = (await InstrumentPosition.Fetch(query)) ?? [];
    const { instrument_position, auto_status, margin_mode, open_take_profit, open_stop_loss } = result;

    if (instrument_position) {
      const query = props.stop_request
        ? { stop_request: props.stop_request }
        : ({
            instrument_position,
            status: props.stop_type === "tp" && open_take_profit ? "Pending" : props.stop_type === "sl" && open_stop_loss ? "Pending" : "Queued",
          } satisfies Partial<IStopOrder>);
      const [current] = (await Fetch(query, { suffix: `ORDER BY update_time DESC LIMIT 1` })) ?? [{ stop_request: undefined }];

      if (current.stop_request) {
        props.update_time === undefined && Object.assign(props, { update_time: Date() });

        if (props.update_time! > current.update_time!) {
          if (auto_status === "Enabled") {
            const promise = Fetch({ instrument_position, stop_type: current.stop_type }, { suffix: `AND status IN ("Pending", "Queued")` }) ?? [{}];
            const queue = await promise;
            if (queue) {
              const cancels = queue.filter(({ stop_request }) => !isEqual(stop_request!, current.stop_request!));
              const promises = cancels.map(({ stop_request }) =>
                Cancel({ stop_request, memo: `[Warning] Stop.Request.Submit: New TPSL request on open instrument/position auto-cancels existing` }),
              );
              await Promise.all(promises);
              props.status = current.status === "Pending" ? "Hold" : current.status;
            }
          }

          if (props.status === "Hold") {
            const result = await publish(current, {
              ...props,
              memo: props.memo || `[Info] Stops.Submit: Stop request updated; put on hold; pending cancel and resubmit`,
            });
            return result ? result : undefined;
          } else {
            await publish(current, { ...props, memo: props.memo || `[Info] Stops.Submit: Stop request exists; updated locally` });
            return current.stop_request;
          }
        } else return current.stop_request;
      } else {
        // Handle new request submission
        const result = await publish(
          {},
          {
            ...props,
            instrument_position,
            margin_mode: props.margin_mode || margin_mode,
            memo: props.memo || `[Warning] Stops.Submit: Stop Request missing; was added locally; updated and settled`,
          },
        );
        return result ? result : undefined;
      }
    } else {
      console.log(">> [Error] Stops.Submit: Invalid stop request; missing instrument position; request rejected");
      return undefined;
    }
  }
};
