/**
 * @file api/index.ts
 */

// 1. Logic Exports (The Functions - Runtime)
export * as Accounts from "#api/interfaces/accounts";
export * as Candles from "#api/interfaces/candles";
export * as InstrumentPositions from "#api/interfaces/instrumentPositions";
export * as Instruments from "#api/interfaces/instruments";
export * as Leverages from "#api/interfaces/leverages";
export * as Positions from "#api/interfaces/positions";
export * as Requests from "#api/interfaces/requests";
export * as Orders from "#api/interfaces/orders";
export * as StopRequests from "#api/interfaces/stopRequests";
export * as StopOrders from "#api/interfaces/stopOrders";

export type * from "#api/types";
export * from "#api/api.util"; // Factories like AsResult

// 2. Type Exports (The Blueprints - Compile-time Only)
export type { IAccountAPI } from "#api/interfaces/accounts";
export type { ICandleAPI } from "#api/interfaces/candles";
export type { IInstrumentAPI } from "#api/interfaces/instruments";
export type { ILeverageAPI } from "#api/interfaces/leverages";
export type { IOrderAPI } from "#api/interfaces/orders";
export type { IPositionsAPI } from "#api/interfaces/positions";
export type { IRequestAPI } from "#api/interfaces/requests";
//export type { IStopRequestAPI } from "#api/interfaces/stopRequests";
export type { IStopOrderAPI } from "#api/interfaces/stopOrders";

// 3. Exposed DB functions
export { PrimaryKey } from "#db";