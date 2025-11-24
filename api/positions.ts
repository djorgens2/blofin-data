//+--------------------------------------------------------------------------------------+
//|                                                                  [api]  positions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPositions } from "db/interfaces/positions";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { Session, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { format } from "lib/std.util";
import { Select } from "db/query.utils";

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

// +----------------------------------------------------------------------------------------+
// | Format and publish position updates concurrently; returns [updates, errors] tuple      |
// +----------------------------------------------------------------------------------------+
export const Publish = async (props: Array<IPositionsAPI>): Promise<[Array<Partial<IInstrumentPosition>>, Array<Partial<IPositions>>]> => {
  if (!(props && props.length)) {
    return [[], []];
  }

  const promises = props.map(async (prop) => {
    const promise = InstrumentPositions.Key({ account: Session().account, symbol: prop.instId, position: prop.positionSide });
    const position = {
      positions: hexify(parseInt(prop.positionId), 6),
      size: format(prop.positions),
      size_available: format(prop.availablePositions),
      leverage: parseInt(prop.leverage!),
      margin_mode: prop.marginMode,
      margin_used: format(prop.margin),
      margin_ratio: format(prop.marginRatio, 3),
      margin_initial: format(prop.initialMargin),
      margin_maint: format(prop.maintenanceMargin),
      average_price: format(prop.averagePrice),
      mark_price: format(prop.markPrice),
      liquidation_price: format(prop.liquidationPrice),
      unrealized_pnl: format(prop.unrealizedPnl),
      unrealized_pnl_ratio: format(prop.unrealizedPnlRatio, 3),
      adl: parseInt(prop.adl),
      create_time: prop.createTime ? new Date(parseInt(prop.createTime)) : new Date(),
      update_time: prop.updateTime ? new Date(parseInt(prop.updateTime)) : new Date(),
    } as Partial<IPositions>;

    const instrument_position = await promise;
    const formatted = { ...position, instrument_position };
    const result = await Positions.Publish(formatted);

    if (result) {
      const [ipos] = await InstrumentPositions.Publish([{ instrument_position, status: "Open" }]) ?? [];

      if (ipos) {
        return { type: "success", data: ipos} as const;
      } else {
        return { type: "error", data: position } as const;
      }
    } else {
      return { type: "error", data: position } as const;
    }
  });

  const results = await Promise.all(promises);
  const updates: Array<Partial<IInstrumentPosition>> = results
    .filter((r): r is { type: "success"; data: Partial<IInstrumentPosition> } => r?.type === "success")
    .map((r) => r.data);
  const errors: Array<Partial<IPositions>> = results.filter((r): r is { type: "error"; data: Partial<IPositions> } => r?.type === "error").map((r) => r.data);

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

// +--------------------------------------------------------------------------------------+
// | Scrubs positions on api/wss-timer, sets status, reconciles history, updates locally; |
// +--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Position.Import [API]");

  const active: Array<IPositionsAPI> = await Active();
  const [accepted, rejected] = await Publish(active);
  const history = await Select<IInstrumentPosition>({ status: `Open` }, { table: `vw_instrument_positions` });

  const success: Array<Partial<IInstrumentPosition>> = [];
  const failed: Array<Partial<IInstrumentPosition>> = [];

  if (history.length) {
    const lookup = new Set(accepted.map((p) => p.instrument_position));
    const promises = history.map(async (local) => {
      if (!lookup.has(local.instrument_position!)) {
        const [result] = await InstrumentPositions.Publish([{ instrument_position: local.instrument_position, status: "Closed" }]) ?? [];
        result ? success.push(result) : failed.push(local);
      }
    });

    await Promise.all(promises);

    active.length && console.log(`>> Active Positions Processed [${active.length}]:  ${active.length} published`);
    success && success.length && console.log(`   # [Info] Positions processed [${history.length}]:  ${success.length} published`);
    failed && failed.length && console.log(`   # [Error] Errors publishing Position: `, failed.length, failed);
    rejected && rejected.length && console.log(`   # [Warning] Positions rejected: `, rejected.length, rejected);
  }
};
