//+--------------------------------------------------------------------------------------+
//|                                                                  [api]  positions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "#api";
import type { IPositions } from "#db/interfaces/positions";
import type { IInstrumentPosition } from "#db/interfaces/instrument_position";

import { Session } from "#module/session";
import { hexify } from "#lib/crypto.util";
import { format, isEqual } from "#lib/std.util";
import { Select } from "#db/query.utils";
import { API_GET } from "#api";

import * as Positions from "#db/interfaces/positions";
import * as InstrumentPositions from "#db/interfaces/instrument_position";

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

/**
 * Format and publish position updates concurrently;
 */
export const Publish = async (props: Array<Partial<IPositionsAPI>>, context = "Positions") => {
  context = `${context}.Publish`;

  const api: Array<IPublishResult<IPositions>> = await Promise.all(
    props.map(async (prop) => {
      const instrument_position = await InstrumentPositions.Key({ account: Session().account, symbol: prop.instId, position: prop.positionSide });

      if (!instrument_position) {
        return { key: undefined, response: { success: false, state: `not_found`, message: `[Error] ${context}.`, code: 409, rows: 0, context } };
      }

      const position: Partial<IPositions> = {
        positions: hexify(parseInt(prop.positionId!), 6),
        instrument_position,
        size: format(prop.positions!),
        size_available: format(prop.availablePositions!),
        leverage: parseInt(prop.leverage!!),
        margin_mode: prop.marginMode || Session().margin_mode || `cross`,
        margin_used: format(prop.margin!),
        margin_ratio: format(prop.marginRatio!, 3),
        margin_initial: format(prop.initialMargin!),
        margin_maint: format(prop.maintenanceMargin!),
        average_price: format(prop.averagePrice!),
        mark_price: format(prop.markPrice!),
        liquidation_price: format(prop.liquidationPrice!),
        unrealized_pnl: format(prop.unrealizedPnl!),
        unrealized_pnl_ratio: format(prop.unrealizedPnlRatio!, 3),
        adl: parseInt(prop.adl!),
        create_time: prop.createTime ? new Date(parseInt(prop.createTime)) : undefined,
        update_time: prop.updateTime ? new Date(parseInt(prop.updateTime)) : undefined,
      };

      return await Positions.Publish(position);
    }),
  );

  const active: Array<IPublishResult<IInstrumentPosition>> = await Promise.all(
    api
      .filter((p) => p?.response.success && p.key?.instrument_position)
      .map(async (p) => {
        return InstrumentPositions.Publish({ instrument_position: p.key?.instrument_position, status: "Open" });
      }),
  );

  let closed: Array<IPublishResult<IInstrumentPosition>> = [];
  const current = await Select<IInstrumentPosition>({ account: Session().account, status: `Open` }, { table: `vw_instrument_positions` });

  if (current.success && current.data?.length) {
    const closures = current.data?.filter((local) => !active.some((position) => isEqual(position?.key?.instrument_position!, local.instrument_position!)));
    closed = await Promise.all(
      closures.map(async (position) => InstrumentPositions.Publish({ instrument_position: position.instrument_position, status: "Closed" })),
    );
  }
  return [...active, ...closed];
};

/**
 * Audits positions from broker api for currently logged account;
 */
export const Import = async (): Promise<Array<IPublishResult<IPositions>>> => {
  console.log("In Position.Import [API]", new Date().toLocaleString());
  const result = await API_GET<Array<Partial<IPositionsAPI>>>("/api/v1/account/positions", "Positions.Import");

  return Publish(result);
};
