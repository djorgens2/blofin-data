//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestState, TRequest, TPosition } from "@db/interfaces/state";

import { Modify, Select, parseColumns } from "@db/query.utils";
import { hexify, uniqueKey } from "@lib/crypto.util";

import * as Instrument from "@db/interfaces/instrument";
import * as InstrumentPosition from "@db/interfaces/instrument_position";
import * as References from "@db/interfaces/reference";
import * as States from "@db/interfaces/state";

export interface IStopRequest {
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  position: "short" | "long" | "net";
  stop_request: Uint8Array;
  stop_type: "tp" | "sl";
  state: Uint8Array;
  status: TRequest;
  action: "buy" | "sell";
  size: number;
  trigger_price: number;
  order_price: number;
  reduce_only: boolean;
  memo: string;
  create_time: Date | number;
}

export interface IStopOrder extends IStopRequest {
  tpsl_id: number;
  position_state: Uint8Array;
  position_status: TPosition;
  request_state: Uint8Array;
  request_status: TRequest;
  order_state: Uint8Array;
  order_status: string;
  actual_size: number;
  system_generated: boolean;
  broker_id: string;
}

export type TAppResponse = Array<{ instId: string | undefined; tpsl_id: number | undefined; memo: string }>;

//+--------------------------------------------------------------------------------------+
//| Submits application (auto) stop requests locally on Open positions;                  |
//+--------------------------------------------------------------------------------------+
export const Submit = async (request: Partial<IStopRequest>): Promise<IStopRequest | undefined> => {
  const [positionInfo] = request.instrument_position
    ? await InstrumentPosition.Fetch({ instrument_position: request.instrument_position })
    : await InstrumentPosition.Fetch({ symbol: request.symbol, position: request.position });
  const openRequests = request.stop_type === "tp" ? positionInfo.open_take_profit : positionInfo.open_stop_loss;

  //--- Format and locate the stop request for submission
  const verify = async (): Promise<[IStopRequest, boolean]> => {
    const { stop_type, action, size, trigger_price, order_price, reduce_only, memo } = request;
    const submit = {
      stop_type,
      action,
      size,
      trigger_price,
      order_price,
      reduce_only,
      memo,
      instrument_position: positionInfo.instrument_position,
      instrument: request.instrument || (await Instrument.Key({ symbol: request.symbol })),
      stop_request: request.stop_request || hexify(uniqueKey(8), 4),
      state: request.state || (await States.Key({ status: "Queued" })),
      create_time: request.create_time || Date.now(),
    } as IStopRequest;

    const key = await Key({ stop_request: submit.stop_request, stop_type });
    return [submit, key ? true : false];
  };

  //--- If the position is valid, proceed with the stop request submission
  if (positionInfo) {
    if (positionInfo.auto_status === "Enabled") {
      if (positionInfo.status === "Open") {
        if (openRequests === 0) {
          console.log("Stop request is valid for submission:", request);
        } else {
          console.error("Position already has an open stop order:", request);
          return undefined;
        }
      } else {
        console.error("Position is not open for this stop request:", request);
        return undefined;
      }
    }
  } else {
    console.error("Invalid instrument position for this stop request:", request);
    return undefined;
  }

  //--- If the stop request does not exist, insert it into the database
  const [submit, exists] = await verify();
  if (exists) {
    console.log("Stop request already exists:", submit.stop_request);
    return submit;
  }

  console.log("Inserting new stop request:", submit.stop_request);
  const { symbol, instrument, position, create_time, ...props } = submit;
  const [fields, args] = parseColumns({ ...props }, "");
  const sql = `INSERT INTO blofin.stop_request (${fields.join(", ")}, create_time) VALUES (${Array(args.length).fill("?").join(", ")}, FROM_UNIXTIME(?/1000))`;

  try {
    await Modify(sql, [...args, create_time]);
    return submit;
  } catch (e) {
    console.error("Error submitting stop request:", e);
    return undefined;
  }
};

//+--------------------------------------------------------------------------------------+
//| Publish stop orders from active stops from broker;                                   |
//+--------------------------------------------------------------------------------------+
export async function Publish(orders: Array<Partial<IStopOrder>>) {
  const missing: TAppResponse = [];
  const errors: TAppResponse = [];

  //--- Verify or replace missing stop requests
  const verify = async (order: Partial<IStopOrder>) => {
    const instrument = await Instrument.Key({ symbol: order.symbol });
    const [{ instrument_position, auto_status }] = await InstrumentPosition.Fetch({ instrument, position: order.position });

    if (auto_status === "Enabled") {
      if (order.system_generated) {
        return await Submit({
          ...order,
          instrument_position,
          instrument,
          state,
          memo: `Missing System generated ${order.stop_type} stop request; replaced.`,
        });
      } else {
        return await Submit({
          ...order,
          instrument_position,
          instrument,
          state: await States.Key({ status: "Canceled" }),
          memo: `Non-system generated ${order.stop_type} stop request; canceled.`,
        });
      }
    } else
      return await Submit({
        ...order,
        instrument_position,
        instrument,
        state,
        memo: `Missing manually entered ${order.stop_type} stop request received; published.`,
      });
  };

  if (orders.length) {
    for (const order of orders) {
      if (order.tpsl_id) {
        const request = await verify(order);
        
        // Verify the stop order
        if (request) {
          const [submit] = await Fetch({
            stop_request: request.stop_request,
            stop_type: request.stop_type,
            tpsl_id: order.tpsl_id,
          });

          if (submit) {
            console.log("Stop order already exists in database:", request);
          } else {
            // Publish missing stop order
            console.log("Stop order does not exist in database, proceeding to publish:", request);
            const [fields, args] = parseColumns(
              {
                stop_request: request.stop_request,
                stop_type: request.stop_type,
                tpsl_id: order.tpsl_id,
                order_state: await References.Key<Uint8Array>("order_state", { source_ref: order.order_status }),
                actual_size: order.actual_size || -1,
                broker_id: order.broker_id || "",
              },
              ""
            );

            const sql = `INSERT INTO blofin.stop_order (${fields.join(", ")}, create_time) VALUES (${Array(args.length)
              .fill("?")
              .join(", ")}, FROM_UNIXTIME(?/1000))`;

            try {
              await Modify(sql, [...args, order.create_time]);
              missing.push({ instId: order.symbol, tpsl_id: order.tpsl_id, memo: request.memo });
            } catch (e) {
              console.error("Error publishing stop order:", e);
            }
          }
          console.log("Stop order published:", order.symbol, order.tpsl_id);
        }
      } else {
        console.error("Invalid stop order received; missing tpsl_id:", order);
        errors.push({ instId: order.symbol, tpsl_id: order.tpsl_id, memo: "Invalid stop order received; missing tpsl_id" });
      }
    }
  }
  return [missing, errors];
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IStopOrder>): Promise<Array<Partial<IStopOrder>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_stop_orders ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IStopRequest>(sql, args);
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Key(props: Partial<IStopOrder>): Promise<IStopOrder["stop_request"] | undefined> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT stop_request FROM blofin.vw_stop_orders ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  const key = await Select<IStopOrder>(sql, args);
  const stop_request = key.length === 1 ? key[0].stop_request : undefined;
  return stop_request;
}

//+--------------------------------------------------------------------------------------+
//| Updates tpsl request states upon reconciliation with WSS/API actives;                |
//+--------------------------------------------------------------------------------------+
export const Update = async (updates: Array<Partial<IStopOrder>>) => {
  if (updates.length) {
    for (const update of updates) {
      const { stop_request, stop_type, status, memo } = update;
      const state = update.state || (await States.Key<IRequestState>({ status }));
      const sql = `UPDATE blofin.stop_request SET state = ?, memo = ? WHERE stop_request = ? AND stop_type = ?`;
      const args = [state, memo, stop_request, stop_type];

      try {
        await Modify(sql, args);
      } catch (e) {
        console.log({ sql, args, update });
        console.log(e);
      }
    }
  }
};
