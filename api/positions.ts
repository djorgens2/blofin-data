//+--------------------------------------------------------------------------------------+
//|                                                                  [api]  positions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPositions } from "db/interfaces/positions";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";
import type { IResult } from "api/instruments";

import { Session, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { format, isEqual } from "lib/std.util";
import { Select } from "db/query.utils";

import * as Instrument from "db/interfaces/instrument";
import * as Positions from "db/interfaces/positions";
import * as InstrumentPositions from "db/interfaces/instrument_position";

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
//| Format and publish position updates;                                                 |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: Array<IPositionsAPI>) => {
  const updates: Array<Partial<IInstrumentPosition>> = [];
  const errors: Array<Partial<IPositions>> = [];

  if (props && props.length)
    for (const position of props) {
      const positions = hexify(parseInt(position.positionId), 6);
      const instrument = await Instrument.Key({ symbol: position.instId });
      const instrument_position = await InstrumentPositions.Key({ account: Session().account, instrument: instrument!, position: position.positionSide });
      const result = await Positions.Publish({
        positions,
        instrument_position,
        size: format(position.positions),
        size_available: format(position.availablePositions),
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
        create_time: position.createTime ? new Date(parseInt(position.createTime)) : new Date(),
        update_time: position.updateTime ? new Date(parseInt(position.updateTime)) : new Date(),
      });

      if (result) {
        const result = await InstrumentPositions.Publish({ instrument_position, status: "Open" });
        result ? updates.push(result) : errors.push({ instrument_position });
      }
    }
  return [updates, errors];
};

//+--------------------------------------------------------------------------------------+
//| Retrieves active orders for reconciliation of local db;                              |
//+--------------------------------------------------------------------------------------+
export const Active = async () => {
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
    } else throw new Error(`Position.Active: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error]: Position.Active:", error, method, path, headers);
    return [];
  }
};

//+--------------------------------------------------------------------------------------+
//| Scrubs positions on api/wss-timer, sets status, reconciles history, updates locally; |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Position.Import [API]");

  const active: Array<IPositionsAPI> = await Active();

  const [accepted, rejected] = await Publish(active);
  const history = await Select<IInstrumentPosition>({ status: `Open` }, { table: `vw_instrument_positions` });
  const success: Array<Partial<IInstrumentPosition>> = [];
  const failed: Array<Partial<IInstrumentPosition>> = [];

  if (history.length) {
    for (const local of history) {
      if (accepted.find(({ instrument_position }) => isEqual(instrument_position!, local.instrument_position!))) continue;
      else {
        const result = await InstrumentPositions.Publish({ instrument_position: local.instrument_position, status: "Closed" });
        result
          ? success.push({ instrument_position: local.instrument_position, status: "Closed" })
          : failed.push({ instrument_position: local.instrument_position, status: "Closed" });
      }
    }
    active.length && console.log(`>> Active Positions Processed [${active.length}]:  ${active.length} published`);
    success && success.length && console.log(`   # [Info] Positions processed [${history.length}]:  ${success.length} published`);
    failed && failed.length && console.log(`   # [Error] Errors publishing Position: `, failed.length, failed);
    rejected && rejected.length && console.log(`   # [Warning] Positions rejected: `, rejected.length, rejected);
  }
};
