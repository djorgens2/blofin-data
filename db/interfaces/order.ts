//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { IRequestAPI } from "@api/orders";
import type { IOrderAPI } from "@api/orders";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { hashKey, hexify } from "@lib/crypto.util";
import { hexString } from "@lib/std.util";

import * as Refs from "@db/interfaces/reference";
import * as OrderAPI from "@api/orders";
import * as State from "@db/interfaces/state";
import * as ContractType from "@db/interfaces/contract_type";
import * as InstrumentType from "@db/interfaces/instrument_type";

export interface IRequest {
  client_order_id: Uint8Array;
  state: Uint8Array;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  margin_mode: "cross" | "isolated";
  position: "short" | "long" | "net";
  action: "buy" | "sell";
  order_type: Uint8Array | "limit" | "market";
  price: number;
  size: number;
  leverage: number;
  tp_trigger: string;
  sl_trigger: string;
  memo: string;
  reduce_only: boolean;
  broker_id: string;
  expiry_time: Date;
}

export interface IOrder extends IRequest {
  order_id: string;
  instrument_type: Uint8Array;
  category: Uint8Array;
  cancel: Uint8Array;
  orderId: string;
  filled_amount: number;
  filled_size: number;
  average_price: number;
  fee: number;
  pnl: number;
  create_time: Date | number;
  update_time: Date | number;
}

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export async function Request(props: Partial<IRequest>): Promise<IRequest["client_order_id"] | undefined> {
  const key = hexify(hashKey(6));
  const [state] = await State.Fetch({ status: "Queued" });
  const [apiOrderType] = await Refs.Fetch("order_type", { source_ref: props.order_type });
  const [fields, args] = parseColumns({ ...props, client_order_id: key, state, order_type: apiOrderType!.source_ref }, "");
  const sql = `INSERT INTO blofin.requests ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;

  await Modify(sql, args);

  return key;
}

//+--------------------------------------------------------------------------------------+
//| Formats and emits order requests to broker for execution;                            |
//+--------------------------------------------------------------------------------------+
export async function Execute(): Promise<number> {
  const requests = await OrderAPI.Queue({ status: "Queued" });

  for (let id in requests) {
    const request = requests[id];
    const custKey = hexify(request.clientOrderId!);
    const api: Partial<IRequestAPI> = {
      instId: request.instId!,
      marginMode: request.marginMode!,
      positionSide: request.positionSide!,
      side: request.side!,
      orderType: request.orderType!,
      price: request.price!,
      size: request.size!,
      leverage: request.leverage!,
      reduceOnly: request.reduceOnly!,
      clientOrderId: hexString(custKey!, 3),
      tpTriggerPrice: request.tpTriggerPrice ? request.tpTriggerPrice : undefined,
      tpOrderPrice: request.tpOrderPrice! ? request.tpTriggerPrice : undefined,
      slTriggerPrice: request.slTriggerPrice! ? request.tpTriggerPrice : undefined,
      slOrderPrice: request.slOrderPrice! ? request.tpTriggerPrice : undefined,
      brokerId: request.brokerId ? request.brokerId : undefined,
    };

    await OrderAPI.Submit(api);
  }
  return requests.length;
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IRequest>): Promise<Array<Partial<IRequest>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_requests ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IRequest>(sql, args);
}

// //+--------------------------------------------------------------------------------------+
// //| Retrieve blofin rest api candle data, format, then pass to publisher;                |
// //+--------------------------------------------------------------------------------------+
// export async function Update(props: IOrderAPI) {
//   const [fields, args] = parseColumns(props, ``);
//           const sql =
//             `INSERT INTO blofin.orders (account, currency, ${fields.join(", ")}) VALUES (${"".padEnd(
//               (args.length + 1) * 3,
//               "?, "
//             )}FROM_UNIXTIME(?/1000)) ` + `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")} = FROM_UNIXTIME(?/1000)`;
//           args.unshift(props.account, props.currency, ...args);
//           await Modify(sql, args);

// }
