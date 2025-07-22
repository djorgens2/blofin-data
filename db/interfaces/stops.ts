//+---------------------------------------------------------------------------------------+
//|                                                                              stops.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest } from "@db/interfaces/state";
import { Modify, parseColumns, Select } from "@db/query.utils";

export interface IStopRequest {
  stop_request: Uint8Array;
  stop_type: "tp" | "sl";
  tpsl_id: string;
  order_state: string;
  action: "buy" | "sell";
  size: number;
  actual_size: number;
  trigger_price: number;
  order_price: number;
  reduce_only: boolean;
  broker_id: string;
  create_time: Date | number;
}

//+--------------------------------------------------------------------------------------+
//| Publish request to broker;                                               |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Array<Partial<IStopRequest>>) {
  if (props.length) console.log(props);
  for (const publish of props) {
    const stop_request = await Fetch({ stop_request: publish.stop_request });

    if (stop_request) {
      //-- exists
      console.log(stop_request);
    } else {
      //-- missing
      //   const { stop_request, create_time, ...publish } = publish;
      //   const { tpsl_id } = publish;
      //   const [fields, args] = parseColumns({ ...publish }, "");
      //   const sql = `INSERT IGNORE INTO blofin.stop_order (${fields.join(", ")}, request, create_time) VALUES (${Array(args.length)
      //     .fill("?")
      //     .join(", ")}, ?, FROM_UNIXTIME(?/1000))`;
      //   try {
      //     await Modify(sql, [...args, request, create_time, ...args, create_time]);
      //     for (const id in stops!) {
      //       const { stop_type, trigger_price, order_price } = stops[id];
      //       await Modify(`INSERT IGNORE INTO blofin.position_stops (tpsl_id, stop_type, trigger_price, order_price) VALUES ( ?, ?, ?, ?)`, [
      //         tpsl_id,
      //         stop_type,
      //         trigger_price,
      //         order_price,
      //       ]);
      //     }
      //     return request;
      //   } catch (e) {
      //     console.log({ sql, fields, args });
      //     console.log(e);
      //   }
    }
  }
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IStopRequest>): Promise<Array<Partial<IStopRequest>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_stop_orders ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IStopRequest>(sql, args);
}
