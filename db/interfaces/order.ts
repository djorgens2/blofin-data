//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";
import type { IRequestAPI } from "@api/orders";
import { Modify, parseColumns, Select } from "@db/query.utils";
import { hashKey, hexify } from "@lib/crypto.util";
import { hexString } from "@lib/std.util";

import * as Refs from "@db/interfaces/reference";
import * as OrderAPI from "@api/orders";

export interface IRequest {
  client_order_id: Uint8Array;
  order_state: Uint8Array;
  account: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  margin_mode: "cross" | "isolated" | undefined;
  bias: "short" | "long" | "net" | undefined;
  action: "buy" | "sell" | undefined;
  order_type: Uint8Array | "limit" | "market" | undefined;
  price: number;
  size: number;
  leverage: number;
  tp_trigger: string;
  sl_trigger: string;
  reduce_only: boolean;
  memo: string;
  broker_id: string;
  expiry_time: Date;
}
export interface IOrder extends IRequest, RowDataPacket {
  broker_id: string;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export async function Request(props: Partial<IRequest>): Promise<IRequest["client_order_id"] | undefined> {
  const key = hexify(hashKey(6));
  const [{ order_state }] = await Refs.Fetch("order_state", { order_state: undefined, source_ref: "live" });
  const [{ order_type }] = await Refs.Fetch("order_type", { order_type: undefined, source_ref: props.order_type });

  const [fields, args] = parseColumns({ ...props, client_order_id: key, order_state, order_type }, "");
  const sql = `INSERT INTO blofin.requests ( ${fields.join(", ")} ) VALUES (${Array(args.length).fill(" ?").join(", ")} )`;
  await Modify(sql, args);
  console.log(sql, args, props);
  return key;
}

//+--------------------------------------------------------------------------------------+
//| Formats and emits order requests to broker for execution;                            |
//+--------------------------------------------------------------------------------------+
export async function Execute(): Promise<number> {
  const requests = await Refs.Fetch<Partial<IRequestAPI>>("vw_api_requests", { orderState: "live" });

  for (let id in requests) {
    const request = requests[id];
    const custKey = hexify(request.clientOrderId!);
    const api: IRequestAPI = {
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

    await OrderAPI.Submit(api)
  }
  return requests.length;
}
