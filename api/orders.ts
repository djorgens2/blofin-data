//+--------------------------------------------------------------------------------------+
//|                                                                            orders.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { TSession } from "@module/session";

import { parseColumns } from "@db/query.utils";
import { Session, signRequest } from "@module/session";

export interface IRequestAPI {
  instId: string;
  marginMode: string;
  positionSide: string;
  side: string;
  orderType: string;
  price: string;
  size: string;
  leverage: string;
  reduceOnly: string;
  clientOrderId: string;
  tpTriggerPrice: string | undefined;
  tpOrderPrice: string | undefined;
  slTriggerPrice: string | undefined;
  slOrderPrice: string | undefined;
  brokerId: string | undefined;
  orderState?: string;
}

export interface IOrdersAPI {
  data: [
    {
      instId: string;
      instType: string;
      orderId: string;
      clientOrderId: string;
      price: string;
      size: string;
      orderType: string;
      side: string;
      positionSide: string;
      marginMode: string;
      filledSize: string;
      filledAmount: string;
      averagePrice: string;
      state: string;
      leverage: string;
      tpTriggerPrice: string;
      tpTriggerPriceType: string;
      tpOrderPrice: string;
      slTriggerPrice: string;
      slTriggerPriceType: string;
      slOrderPrice: string;
      fee: string;
      pnl: string;
      cancelSource: string;
      orderCategory: string;
      createTime: string;
      updateTime: string;
      reduceOnly: string;
      brokerId: string;
    }
  ];
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Submit(props: Partial<IRequestAPI>) {
  // @ts-ignore
  Object.keys(props).forEach((key) => props[key] === undefined && delete props[key]);
  const method = "POST";
  const path = "/api/v1/trade/order";
  const body = JSON.stringify(props);
  const { api, phrase, rest_api_url } = Session();
  const { sign, timestamp, nonce } = await signRequest(method, path, body);
  
  const headers = {
    "ACCESS-KEY": api!,
    "ACCESS-SIGN": sign!,
    "ACCESS-TIMESTAMP": timestamp!,
    "ACCESS-NONCE": nonce!,
    "ACCESS-PASSPHRASE": phrase!,
    "Content-Type": "application/json",
  };

  fetch(rest_api_url!.concat(path), {
    method,
    headers,
    body,
  })
    .then((response) => response.json())
    .then((json) => console.log(json))
    .catch((error) => console.log(error));

  // # Place order
  // response = requests.post(
  //     "https://openapi.blofin.com/api/v1/trade/order",
  //     headers=headers,
  //     json=order_request
  // )
  // response.raise_for_status()
  // order_response = response.json()

  // # Verify response format and success
  // if not isinstance(order_response, dict):
  //     raise Exception(f"Invalid order response format: {order_response}")

  // if "code" in order_response and order_response["code"] != "0":
  //     raise Exception(f"Order API error: {order_response}")

  // if "data" not in order_response:
  //     raise Exception(f"No data in order response: {order_response}")

  // order_id = order_response["data"][0]["orderId"]
  // print(f"Order placed: {order_id}")
}
