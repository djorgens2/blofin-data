//+---------------------------------------------------------------------------------------+
//|                                                                    [api]  response.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TRequest, IRequestState } from "db/interfaces/state";
import type { ILeverageAPI } from "api/leverage";

import { hexify } from "lib/crypto.util";
import { Update } from "db/query.utils";
import { Session } from "module/session";

import * as States from "db/interfaces/state";
import * as Orders from "db/interfaces/order";
import * as Instrument from "db/interfaces/instrument";
import { IInstrumentPosition } from "db/interfaces/instrument_position";

export type TResponse = {
  code: string;
  msg: string;
  data: Array<{
    orderId: string;
    tpslId: string;
    clientOrderId: string;
    instId: string;
    state: string;
    leverage: string;
    marginMode: string;
    positionSide: string;
    msg: string;
    code: string;
  }>;
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

    for (const current of response.data) {
      const request = {
        request: hexify(current.clientOrderId, 6) || hexify(parseInt(current.orderId), 6),
        order_id: hexify(parseInt(current.orderId), 6),
        state: current.code === "0" ? success : fail,
        memo:
          current.code === "0"
            ? `[Info] Response.Request: Order ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Request: ${props.fail === "Rejected" ? `Order` : `Cancellation`} failed with code [${current.code}]: ${current.msg}`,
        update_time: new Date(),
      };
      const [result, updates] = await Update<Orders.IOrder>(request, { table: `request`, keys: [{ key: `request` }] });
      result ? accept.push({ ...request, code: parseInt(current.code) }) : reject.push({ ...request, code: parseInt(current.code) });
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

    for (const request of current) {
      const stop_request = {
        stop_request: hexify(request.clientOrderId, 5),
        tpsl_id: hexify(parseInt(request.tpslId), 4),
        state: request.code === "0" ? success : fail,
        memo:
          request.code === "0"
            ? `[Info] Response.Stops: StopOrder ${props.success === "Pending" ? `submitted` : `canceled`} successfully`
            : `[Error] Response.Stops: ${props.fail === "Rejected" ? `Stop` : `Cancellation`} failed with code [${request.code}]: ${request.msg}`,
        update_time: new Date(),
      };
      const [result, updates] = await Update(stop_request, { table: `stop_request`, keys: [{ key: `stop_request` }] });
      result ? accept.push({ ...stop_request, code: parseInt(request.code) }) : reject.push({ ...stop_request, code: parseInt(request.code) });
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

    const { instId, positionSide, leverage } = response.data;
    const props = {
      account: Session().account,
      instrument: await Instrument.Key({ symbol: instId }),
      position: positionSide,
      leverage: parseInt(leverage),
    };
    const [result, updates] = await Update<IInstrumentPosition>(props, {
      table: `instrument_position`,
      keys: [{ key: `account` }, { key: `instrument` }, { key: `position` }],
    });
    result && updates && console.log("-> Leverage updated:", props);
    return result ? [response.data] : undefined;
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
  if (response.code === "0") return Array.isArray(response.data) ? response.data : undefined;

  console.log(
    `-> [Error] Response.Instruments: update not processed; error returned:`,
    response.code || -1,
    response.msg ? `response: `.concat(response.msg) : ``
  );
  return undefined;
};
