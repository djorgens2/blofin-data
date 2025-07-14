//+--------------------------------------------------------------------------------------+
//|                                                                         positions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import type { IPositions } from "@db/interfaces/positions";
import type { IInstrumentPosition } from "@db/interfaces/instrument_position";

import { Session, signRequest } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { format } from "@lib/std.util";
import { Select } from "@db/query.utils";

import * as Instrument from "@db/interfaces/instrument";
import * as Positions from "@db/interfaces/positions";
import * as InstrumentPositions from "@db/interfaces/instrument_position";

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
  const active: Array<Partial<IInstrumentPosition>> = [];
  for (const position of props) {
    const positions = hexify(parseInt(position.positionId), 4);
    const instrument = await Instrument.Key({ symbol: position.instId });
    const update: Partial<IPositions> = {
      positions,
      instrument,
      position: position.positionSide,
      size: parseFloat(position.positions),
      size_available: parseFloat(position.availablePositions),
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
    active.push({ instrument, position: update.position, status: "Open" });
  }
  return active;
}

//+--------------------------------------------------------------------------------------+
//| History - retrieves position history; *** non-functional;                            |
//+--------------------------------------------------------------------------------------+
// const History = async () => {
//   const method = "GET";
//   const path = "/api/v1/account/positions-history";
//   const { api, phrase, rest_api_url } = Session();
//   const { sign, timestamp, nonce } = await signRequest(method, path);
//   const headers = {
//     "ACCESS-KEY": api!,
//     "ACCESS-SIGN": sign!,
//     "ACCESS-TIMESTAMP": timestamp!,
//     "ACCESS-NONCE": nonce!,
//     "ACCESS-PASSPHRASE": phrase!,
//     "Content-Type": "application/json",
//   };

//   try {
//     const response = await fetch(rest_api_url!.concat(path), {
//       method,
//       headers,
//     });
//     if (response.ok) {
//       const json = await response.json();
//       return json.data;
//     }
//   } catch (error) {
//     console.log(error);
//     return [];
//   }
// };

//+--------------------------------------------------------------------------------------+
//| Import - retrieves active orders; reconciles with local db;                          |
//+--------------------------------------------------------------------------------------+
export async function Active() {
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

  try {
    const response = await fetch(rest_api_url!.concat(path), {
      method,
      headers,
    });
    if (response.ok) {
      const json = await response.json();
      return json.data;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
}

//+--------------------------------------------------------------------------------------+
//| Scrubs positions on api/wss-timer, sets status, reconciles history, updates locally; |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  const history = await Select<IInstrumentPosition>(`SELECT * FROM blofin.vw_instrument_positions WHERE position_open = true`, []);
  const active: Array<IPositionsAPI> = await Active();
  const publish = await Publish(active);

  if (history.length)
    for (const local of history) {
      const { instrument, symbol, position } = local;
      const found = active.find(({ instId, positionSide }) => instId === symbol && positionSide === position);
      !found && publish.push({ instrument, position, status: "Closed" });
    }
  publish.length && (await InstrumentPositions.Update(publish));
};
