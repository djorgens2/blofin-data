/**
 * API Integration for Active Trading Positions.
 * 
 * Manages the lifecycle of open positions by synchronizing real-time broker data
 * with the local database. Includes logic to automatically mark positions as 
 * 'Closed' if they no longer appear in the API feed.
 * 
 * @module api/positions
 * @copyright 2018-2026, Dennis Jorgenson
 */

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

/**
 * Raw position data structure from the Broker API.
 */
export interface IPositionsAPI {
  /** Unique position identifier from the exchange. */
  positionId: string;
  /** Instrument type (e.g., SWAP, FUTURES). */
  instType: string;
  /** Trading symbol (e.g., BTC-USDT). */
  instId: string;
  /** Margin mode applied to this position. */
  marginMode: "cross" | "isolated";
  /** Direction of the trade. */
  positionSide: "short" | "long" | "net";
  /** Total size of the position. */
  positions: string;
  /** Size currently available to close/reduce. */
  availablePositions: string;
  /** Entry price average. */
  averagePrice: string;
  /** Floating profit and loss. */
  unrealizedPnl: string;
  /** PnL expressed as a percentage ratio. */
  unrealizedPnlRatio: string;
  /** Leverage multiplier used. */
  leverage: string;
  /** Price at which the position will be liquidated. */
  liquidationPrice: string;
  /** Current index mark price. */
  markPrice: string;
  /** Margin initially required to open. */
  initialMargin: string;
  /** Current total margin assigned. */
  margin: string;
  /** Current margin health ratio. */
  marginRatio: string;
  /** Minimum margin required to avoid liquidation. */
  maintenanceMargin: string;
  /** Auto-Deleveraging (ADL) ranking. */
  adl: string;
  /** Creation timestamp in milliseconds. */
  createTime: string;
  /** Last update timestamp in milliseconds. */
  updateTime: string;
}

/**
 * Processes, formats, and persists a batch of position updates.
 * 
 * Execution Flow:
 * 1. Maps raw API strings to formatted numeric and date types.
 * 2. Cross-references `instId` and `positionSide` to find the local {@link InstrumentPositions.Key}.
 * 3. Updates/Inserts granular position metrics (PnL, Margin, ADL).
 * 4. Updates the parent Instrument Position status to 'Open'.
 * 5. **Reconciliation**: Compares active API positions against local 'Open' positions. 
 *    Any local position missing from the API update is automatically updated to 'Closed'.
 * 
 * @param props - Array of raw position payloads from the API.
 * @param context - Tracing context for logging.
 * @returns A promise resolving to the combined results of open and closed position updates.
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
 * Synchronizes the current account's active positions from the broker API.
 * 
 * Fetches data from the `/api/v1/account/positions` endpoint and passes 
 * it to the {@link Publish} method for database synchronization.
 * 
 * @returns A promise resolving to an array of publication results for the updated positions.
 */
export const Import = async (): Promise<Array<IPublishResult<IPositions>>> => {
  console.log("In Position.Import [API]", new Date().toLocaleString());
  const result = await API_GET<Array<Partial<IPositionsAPI>>>("/api/v1/account/positions", "Positions.Import");

  return result ? Publish(result.data!) : [];
};
