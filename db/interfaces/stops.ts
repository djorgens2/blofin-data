//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest } from "@db/interfaces/state";
import { Modify, parseColumns, Select } from "@db/query.utils";

export interface IStopDetail {
  stop_type: "tp" | "sl";
  trigger_price: number;
  order_price: number;
}

export interface IStopRequest {
  request: Uint8Array;
  tpsl_id: string;
  state: string;
  action: "buy" | "sell";
  size: number;
  actual_size: number;
  stops: Array<IStopDetail>;
  reduce_only: boolean;
  broker_id: string;
  create_time: Date | number;
}

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IStopRequest>): Promise<IStopRequest["request"] | undefined> {
  const { request, create_time, stops, ...publish } = props;
  const { tpsl_id } = publish;
  const [fields, args] = parseColumns({ ...publish }, "");
  const sql = `INSERT IGNORE INTO blofin.stop_order (${fields.join(", ")}, request, create_time) VALUES (${Array(args.length)
    .fill("?")
    .join(", ")}, ?, FROM_UNIXTIME(?/1000))`;

  try {
    await Modify(sql, [...args, request, create_time, ...args, create_time]);

    for (const id in stops!) {
      const { stop_type, trigger_price, order_price } = stops[id];
      await Modify(`INSERT IGNORE INTO blofin.position_stops (tpsl_id, stop_type, trigger_price, order_price) VALUES ( ?, ?, ?, ?)`, [
        tpsl_id,
        stop_type,
        trigger_price,
        order_price,
      ]);
    }
    return request;
  } catch (e) {
    console.log({ sql, fields, args });
    console.log(e);
  }
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IStopRequest>): Promise<Array<Partial<IStopRequest>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_positions ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IStopRequest>(sql, args);
}
