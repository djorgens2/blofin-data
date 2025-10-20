//+---------------------------------------------------------------------------------------+
//|                                                                              order.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";

import { Select, Insert, Update } from "db/query.utils";
import { hasValues, hexString, isEqual } from "lib/std.util";
import { Session } from "module/session";

export interface IOrder extends IRequest {
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
  trade_state: Uint8Array;
  trade_status: string;
  trade_timeframe: string;
  suspense: boolean;
}

//+--------------------------------------------------------------------------------------+
//| Publish - scrubs blofin api updates, applies keys, and executes merge to local db;   |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Partial<IOrder>) => {
  if (props) {
    const order = await Fetch({ order_id: props.order_id });
    if (order) {
      const [current] = order;
      const order_id = current.order_id;
      if (order_id && isEqual(order_id, props.order_id!)) {
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

        const [result, updates] = await Update(revised, { table: `orders`, keys: [{ key: `order_id` }] });
        return updates ? result!.order_id : undefined;
      }
    } else {
      const order: Partial<IOrder> = {
        order_id: props.order_id,
        order_category: props.order_category,
        order_state: props.order_state,
        cancel_source: props.cancel_source,
        filled_size: props.filled_size,
        filled_amount: props.filled_amount,
        average_price: props.average_price,
        fee: props.fee,
        pnl: props.pnl,
      };

      const result = await Insert<IOrder>(order, { table: `orders` });
      return result ? result.order_id : undefined;
    }
    console.log("[Error] Order.Publish: Missing request", { props });
  }
};

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IOrder>): Promise<Array<Partial<IOrder>> | undefined> => {
  Object.assign(props, { account: props.account || Session().account });
  const result = await Select<IOrder>(props, { table: `vw_orders` });
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
