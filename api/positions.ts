//+--------------------------------------------------------------------------------------+
//|                                                                         positions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IPositions } from "@db/interfaces/positions";
import type { IMessage } from "@lib/app.util";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { format } from "@lib/std.util";

import * as Instrument from "@db/interfaces/instrument";
import * as InstrumentType from "@db/interfaces/instrument_type";
import * as Positions from "@db/interfaces/positions";
import * as StopsAPI from "@api/stops";

export interface IPositionsAPI {
  positionId: string;
  instType: string;
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  positions: string;
  availablePositions: string;
  averagePrice: string;
  unrealizedPnl: string;
  unrealizedPnlRatio: string;
  leverage: string;
  liquidationPrice: string;
  markPrice: string;
  initialMargin: string;
  margin: string;
  marginRatio: string;
  maintenanceMargin: string;
  adl: string;
  createTime: string;
  updateTime: string;
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin rest api candle data, format, then pass to publisher;                |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Array<IPositionsAPI>) {
  const active = [];
  for (const position of props) {
    const position_id = hexify(parseInt(position.positionId), 4);
    const instrument = await Instrument.Key({ symbol: position.instId });
    const instrument_type = await InstrumentType.Key({ source_ref: position.instType });
    const inst_type_default = await InstrumentType.Key({ source_ref: "SWAP" });
    const update: Partial<IPositions> = {
      position_id,
      position: position.positionSide,
      positions: parseInt(position.positions),
      positions_avail: parseInt(position.availablePositions),
      instrument,
      instrument_type: instrument_type ? instrument_type : inst_type_default,
      leverage: parseInt(position.leverage!),
      margin_mode: position.marginMode,
      margin_used: format(position.margin),
      margin_ratio: format(position.marginRatio, 3),
      margin_initial: format(position.initialMargin),
      margin_maint: format(position.maintenanceMargin),
      average_price: format(position.averagePrice),
      liquidation_price: format(position.liquidationPrice),
      mark_price: format(position.markPrice),
      unrealized_pnl: format(position.unrealizedPnl),
      unrealized_pnl_ratio: format(position.unrealizedPnlRatio, 3),
      adl: parseInt(position.adl),
      create_time: parseInt(position.createTime!),
      update_time: parseInt(position.updateTime!),
    };
    await Positions.Publish(update);
    active.push(update);
  }
  await Positions.Update(active);
}

//+--------------------------------------------------------------------------------------+
//| Import - retrieves active orders; reconciles with local db;                          |
//+--------------------------------------------------------------------------------------+
export async function Import() {
  const method = "GET";
  const path = "/api/v1/account/positions";
  const { api, phrase, rest_api_url } = Session();
  const { sign, timestamp, nonce } = await signRequest(method, path);
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
  })
    .then((response) => response.json())
    .then((json) => {
      if (json?.code > 0) throw new Error(json);
      Publish(json.data);
    })
    .catch((error) => console.log({ error, path }));
}
