//+---------------------------------------------------------------------------------------+
//|                                                                    [api]  response.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IStopsAPI } from "api/stops";
import type { IRequestAPI } from "api/requests";
import type { ILeverageAPI } from "api/leverage";
import type { IInstrumentAPI } from "api/instruments";
import type { TRequestState, IRequestState } from "db/interfaces/state";
import type { IStops } from "db/interfaces/stops";

import { hexify } from "lib/crypto.util";
import { Update } from "db/query.utils";

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
  data: Array<Partial<IInstrumentAPI | ILeverageAPI | IRequestAPI | IStopsAPI> & TResult> | ({} & TResult);
};

export interface IResponse {
  code: number;
  msg: string;
  request: Uint8Array;
  order_id: Uint8Array;
  state: Uint8Array;
  status: TRequestState;
  memo: string;
  create_time: Date;
  update_time: Date;
}

//+--------------------------------------------------------------------------------------+
//| Handles responses received from WSS/API or POST calls;                               |
//+--------------------------------------------------------------------------------------+
export const Stops = async (response: TResponse, props: { success: TRequestState; fail: TRequestState }) => {
  const accept: Array<Partial<IStops>> = [];
  const reject: Array<Partial<IStops>> = [];
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
      result ? accept.push(stop_request) : reject.push(stop_request);
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


