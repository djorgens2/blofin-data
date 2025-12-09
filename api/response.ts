//+---------------------------------------------------------------------------------------+
//|                                                                    [api]  response.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IStopsAPI } from "api/stops";
import type { IRequestAPI } from "api/requests";
import type { ILeverageAPI } from "api/leverage";
import type { IInstrumentAPI } from "api/instruments";
import type { TRequest, IRequestState } from "db/interfaces/state";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { hexify } from "lib/crypto.util";
import { Update } from "db/query.utils";
import { Session } from "module/session";

import * as States from "db/interfaces/state";
import * as Orders from "db/interfaces/order";
import * as Instrument from "db/interfaces/instrument";

type TResult = {
  code: string;
  msg: string;
};
export type TResponse = {
  code: string;
  msg: string;
  data: Array<Partial<IInstrumentAPI | ILeverageAPI | IRequestAPI | IStopsAPI> & TResult> |{ } & TResult;
};

export interface IResponse {
  code: number;
  msg: string;
  request: Uint8Array;
  order_id: Uint8Array;
  state: Uint8Array;
  status: TRequest;
  memo: string;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Handles responses received from WSS/API or POST calls;                               |
//+--------------------------------------------------------------------------------------+
export const Request = async (response: TResponse, props: { success: TRequest; fail: TRequest }) => {
  const accept: Array<Partial<IResponse>> = [];
  const reject: Array<Partial<IResponse>> = [];

  if (Array.isArray(response.data)) {
    const success = await States.Key<IRequestState>({ status: props.success });
    const fail = await States.Key<IRequestState>({ status: props.fail });
    const responses = response.data as Array<Partial<IRequestAPI & TResult>>;

    for (const response of responses) {
      const request = {
        request: hexify(response.clientOrderId!, 6) || hexify(parseInt(response.orderId!), 6),
        order_id: hexify(parseInt(response.orderId!), 6),
        state: response.code === "0" ? success : fail,
        memo:
          response.code === "0"
            ? `[Info] Response.Request: Order ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Request: ${props.fail === "Rejected" ? `Order` : `Cancellation`} failed with code [${response.code}]: ${response.msg}`,
        update_time: new Date(),
      };
      const [result, updates] = await Update<Orders.IOrder>(request, { table: `request`, keys: [{ key: `request` }] });
      result ? accept.push({ ...request, code: parseInt(response.code!) }) : reject.push({ ...request, code: parseInt(response.code!) });
    }
    return [accept, reject];
  } else {
    console.log(
      `-> [Error] Response.Request: Request not processed; error returned:`,
      response.code || -1,
      `${response ? `response: `.concat(response.msg) : ``}`
    );
    return [accept, reject];
  }
};

//+--------------------------------------------------------------------------------------+
//| Handles responses received from WSS/API or POST calls;                               |
//+--------------------------------------------------------------------------------------+
export const Stops = async (response: TResponse, props: { success: TRequest; fail: TRequest }) => {
  const accept: Array<Partial<IResponse>> = [];
  const reject: Array<Partial<IResponse>> = [];
  const current = response.data ? (Array.isArray(response.data) ? response.data : [response.data]) : undefined;

  if (current) {
    const success = await States.Key<IRequestState>({ status: props.success });
    const fail = await States.Key<IRequestState>({ status: props.fail });
    const responses = current as Array<Partial<IStopsAPI & TResult>>;

    for (const response of responses) {
      const stop_request = {
        stop_request: hexify(response.clientOrderId!, 5),
        tpsl_id: hexify(parseInt(response.tpslId!), 4),
        state: response.code === "0" ? success : fail,
        memo:
          response.code === "0"
            ? `[Info] Response.Stops: StopOrder ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Stops: ${props.fail === "Rejected" ? `Stop` : `Cancellation`} failed with code [${response.code}]: ${response.msg}`,
        update_time: new Date(),
      };
      const [result, updates] = await Update(stop_request, { table: `stop_request`, keys: [{ key: `stop_request` }] });
      result ? accept.push({ ...stop_request, code: parseInt(response.code!) }) : reject.push({ ...stop_request, code: parseInt(response.code!) });
    }
    return [accept, reject];
  } else {
    console.log(
      `-> [Error] Response.Stops: Stop request not processed; error returned:`,
      response.code || -1,
      `${response ? `response: `.concat(response.msg) : ``}`
    );
    return [accept, reject];
  }
};

//+--------------------------------------------------------------------------------------+
//| Sets leverage locally on success;                                                    |
//+--------------------------------------------------------------------------------------+
export const Leverage = async (response: TResponse) => {
  if (response.code === "0") {
    if (Array.isArray(response.data)) {
      return response.data as Array<ILeverageAPI>;
    }

    const { instId, positionSide, leverage, marginMode } = response.data as ILeverageAPI & TResult;
    const margin_mode = marginMode || Session().margin_mode;
    const props = {
      account: Session().account,
      instrument: await Instrument.Key({ symbol: instId }),
      position: margin_mode === "isolated" ? positionSide : positionSide || undefined,
      leverage: parseInt(leverage),
    };
    const keys =
      margin_mode === "isolated" || props.position
        ? [{ key: `account` }, { key: `instrument` }, { key: `position` }]
        : [{ key: `account` }, { key: `instrument` }];
    const [result, updates] = await Update<IInstrumentPosition>(props, {
      table: `instrument_position`,
      keys,
    });

    return result ? (result as IInstrumentPosition) : undefined;
  }

  console.log(
    `-> [Error] Response.Leverage: update not processed; error returned:`,
    response.code || -1,
    response.msg ? `response: `.concat(response.msg) : ``
  );
  return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns instrument data from the api on success, error if api call failed;           |
//+--------------------------------------------------------------------------------------+
export const Instruments = async (response: TResponse) => {
  if (response.code === "0") {
    return response.data as Array<IInstrumentAPI>;
  }

  console.log(
    `-> [Error] Response.Instruments: update not processed; error returned:`,
    response.code || -1,
    response.msg ? `response: `.concat(response.msg) : ``
  );
  return undefined;
};
