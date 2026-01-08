//+--------------------------------------------------------------------------------------+
//|                                                                  [api]  positions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPositions } from "db/interfaces/positions";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { Session, signRequest } from "module/session";
import { hexify } from "lib/crypto.util";
import { format, hasValues, isEqual } from "lib/std.util";
import { IPublishResult, Select, Summary, TResponse } from "db/query.utils";

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
export const Publish = async (props: Array<IPositionsAPI>) => {
  if (!hasValues(props)) {
    return Summary([{ success: false, code: 400, state: `null_query`, rows: 0 }]);
  }

  const api: Array<IPublishResult<IPositions>> = await Promise.all(
    props.map(async (prop) => {
      const instrument_position = await InstrumentPositions.Key({ account: Session().account, symbol: prop.instId, position: prop.positionSide });

      if (instrument_position) {
        const position: Partial<IPositions> = {
          positions: hexify(parseInt(prop.positionId), 6),
          instrument_position,
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
          create_time: prop.createTime ? new Date(parseInt(prop.createTime)) : undefined,
          update_time: prop.updateTime ? new Date(parseInt(prop.updateTime)) : undefined,
        };
        return await Positions.Publish(position);
      } else {
        console.log(`>> [Error] Position.Publish: Unable to locate instrument position for ${prop.instId} ${prop.positionSide}`);
        return { key: undefined, response: { success: false, state: `not_found`, code: 409, rows: 0 } };
      }
    })
  );
  const active = await Promise.all(
    api
      .filter((p) => p?.response.success)
      .map(async (p) => {
        return InstrumentPositions.Publish({ instrument_position: p.key?.instrument_position, status: "Open" });
      })
  );
  const current = await Select<IInstrumentPosition>({ account: Session().account, status: `Open` }, { table: `vw_instrument_positions` });
  if (current.length) {
    const closed = await Promise.all(
      current
        .filter((local) => !active.some((p) => isEqual(p?.key?.instrument_position!, local.instrument_position!)))
        .map(async (ipos) => {
          return InstrumentPositions.Publish({ instrument_position: ipos.instrument_position, status: "Closed" });
        })
    );
    return Summary(api.map((p) => p?.response).concat(closed.map((r) => r?.response)));
  } else return Summary(api.map((p) => p?.response));
};

//+--------------------------------------------------------------------------------------+
//| Retrieves open positions for reconciliation with local db;                           |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Position.Import [API]", new Date().toLocaleString());

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
      const result = await response.json();
      const json = result.data as Array<IPositionsAPI>;
      if (result.code === "0") {
        return await Publish(json);
      }
      console.log(
        `-> [Error] Position.Import: failed to retrieve positions; error returned:`,
        result.code || -1,
        result.msg ? `response: `.concat(result.msg) : ``
      );
    } else throw new Error(`Position.Active: Response not ok: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(">> [Error]: Position.Active:", error, method, path, headers);
  }
};
