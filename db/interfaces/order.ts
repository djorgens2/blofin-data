//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";
import type { TRefKey } from "db/interfaces/reference";
import type { IPublishResult } from "api/api.util";

import { PrimaryKey } from "api/api.util";
import { Select, Insert, Update, TOptions, TKey } from "db/query.utils";
import { hasValues, isEqual } from "lib/std.util";
import { Session } from "module/session";

import * as References from "db/interfaces/reference";

export interface IOrder extends IRequest {
  order_id: Uint8Array;
  client_order_id: Uint8Array;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  order_state: Uint8Array;
  order_status: string;
  contract_type: string;
  instrument_type: Uint8Array;
  order_category: Uint8Array;
  category: string;
  cancel_source: Uint8Array;
  canceled_by: string;
  filled_amount: number;
  filled_size: number;
  average_price: number;
  fee: number;
  pnl: number;
  trade_period: Uint8Array;
  trade_timeframe: string;
}

/**
 * Orders.Publish: Scrubs blofin api data, applies keys, and merges with local db.
 */
export const Publish = async (props: Partial<IOrder>): Promise<IPublishResult<IOrder>> => {
  if (!props) {
    console.log(">> [Error] Order.Publish: No order properties provided; publishing rejected");
    return {
      key: undefined,
      response: {
        success: false,
        code: 400,
        response: `null_query`,
        rows: 0,
        context: "Orders.Publish",
        message: "No order properties provided; publishing rejected",
      },
    };
  }
  const { order_id } = props;
  const exists = await Select<IOrder>({ order_id }, { table: `orders` });

  if (exists.length) {
    const [current] = exists;
    const revised: Partial<IOrder> = {
      order_id,
      order_category: isEqual(props.order_category!, current.order_category!) ? undefined : props.order_category,
      order_state: isEqual(props.order_state!, current.order_state!) ? undefined : props.order_state,
      cancel_source: isEqual(props.cancel_source!, current.cancel_source!) ? undefined : props.cancel_source,
      filled_size: isEqual(props.filled_size!, current.filled_size!) ? undefined : props.filled_size,
      filled_amount: isEqual(props.filled_amount!, current.filled_amount!) ? undefined : props.filled_amount,
      average_price: isEqual(props.average_price!, current.average_price!) ? undefined : props.average_price,
      fee: isEqual(props.fee!, current.fee!) ? undefined : props.fee,
      pnl: isEqual(props.pnl!, current.pnl!) ? undefined : props.pnl,
    };

    const result = await Update<IOrder>(revised, { table: `orders`, keys: [[`order_id`]] });
    return { key: PrimaryKey({ order_id }, ["order_id"]), response: { ...result, context: "Orders.Publish" } };
  }

  const [order_category, order_state, cancel_source] = await Promise.all([
    props.order_category ? Promise.resolve(props.order_category) : References.Key<TRefKey>({ source_ref: "normal" }, { table: `order_category` }),
    props.order_state ? Promise.resolve(props.order_state) : References.Key<TRefKey>({ source_ref: props.order_status }, { table: `order_state` }),
    props.cancel_source ? Promise.resolve(props.cancel_source) : References.Key<TRefKey>({ source_ref: "not_canceled" }, { table: `cancel_source` }),
  ]);
  const order: Partial<IOrder> = {
    order_id,
    client_order_id: props.client_order_id!,
    order_category,
    order_state,
    cancel_source,
    filled_size: props.filled_size!,
    filled_amount: props.filled_amount!,
    average_price: props.average_price!,
    fee: props.fee!,
    pnl: props.pnl!,
  };
  const result = await Insert<IOrder>(order, { table: `orders` });
  return { key: PrimaryKey({ order_id }, ["order_id"]), response: { ...result, context: "Orders.Publish" } };
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IOrder>, options?: TOptions<IOrder>): Promise<Array<Partial<IOrder>> | undefined> => {
  Object.assign(props, { account: props.account || Session().account });
  const result = await Select<IOrder>(props, { ...options, table: `vw_orders` });
  return result.length ? result : undefined;
};

//+--------------------------------------------------------------------------------------+
//| Fetches a request key from local db that meet props criteria; notfound returns undef |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IOrder>): Promise<IOrder["request"] | undefined> => {
  if (hasValues<Partial<IOrder>>(props)) {
    Object.assign(props, { account: props.account || Session().account });
    const [result] = await Select<IOrder>(props, { table: `vw_orders` });
    return result ? result.request : undefined;
  } else return undefined;
};
