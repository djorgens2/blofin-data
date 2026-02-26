
/**
 * Trade request payload for the Broker API.
 */
export interface IRequestAPI {
  /** Account identifier hash. */
  account: Uint8Array;
  /** Desired state of the request. */
  status?: TRequestState;
  /** Unique ID provided by the exchange for existing orders. */
  orderId?: string;
  /** Trading symbol (e.g., "BTC-USDT-PERP"). */
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  side: "buy" | "sell";
  /** Order types: "market", "limit", etc. */
  orderType: string;
  price: string;
  size: string;
  leverage: string;
  reduceOnly: string;
  /** Local unique identifier for request tracking. */
  clientOrderId: string;
  tpTriggerPrice: undefined | null;
  tpOrderPrice: undefined | null;
  slTriggerPrice: undefined | null;
  slOrderPrice: undefined | null;
  brokerId: string | undefined;
  memo: string;
  createTime: string;
  updateTime: string;
  expiry_time?: Date;
}

/** Configuration schema for mapping API responses to local database states. */
interface PublishConfig {
  context: string;
  states: { success: string; fail: string };
  outcomes: { success: string; fail: string };
  messages: { success: string; fail: string };
}

// --- Private Functions ---

import type { IPublishResult, TResponse } from "#api";
import type { TRequestState } from "#db/interfaces/state";
import type { IRequest } from "#db";

import { API_POST, ApiError, isApiError, PrimaryKey } from "#api";
import { hexify } from "#lib/crypto.util";

import { Request, Order } from "#db";


/**
 * Trade request payload for the Broker API.
 */
export interface IRequestAPI {
  /** Account identifier hash. */
  account: Uint8Array;
  /** Desired state of the request. */
  status?: TRequestState;
  /** Unique ID provided by the exchange for existing orders. */
  orderId?: string;
  /** Trading symbol (e.g., "BTC-USDT-PERP"). */
  instId: string;
  marginMode: "cross" | "isolated";
  positionSide: "short" | "long" | "net";
  side: "buy" | "sell";
  /** Order types: "market", "limit", etc. */
  orderType: string;
  price: string;
  size: string;
  leverage: string;
  reduceOnly: string;
  /** Local unique identifier for request tracking. */
  clientOrderId: string;
  tpTriggerPrice: undefined | null;
  tpOrderPrice: undefined | null;
  slTriggerPrice: undefined | null;
  slOrderPrice: undefined | null;
  brokerId: string | undefined;
  memo: string;
  createTime: string;
  updateTime: string;
  expiry_time?: Date;
}

type TResponseData = {
  orderId: string;
  clientOrderId: string;
  msg: string;
  code: string;
};

type TRequestResponse = Partial<IRequest> & TResponse;

/** Configuration schema for mapping API responses to local database states. */
interface PublishConfig {
  context: string;
  states: { success: string; fail: string };
  outcomes: { success: string; fail: string };
  messages: { success: string; fail: string };
}

// --- Private Functions ---

/**
 * Processes a batch of API responses and updates the local Request and Order tables.
 * 
 * This helper performs a cross-lookup between the API's `clientOrderId` (or `orderId`)
 * and the local database. It then maps the API's success/failure codes to the 
 * statuses defined in the provided {@link PublishConfig}.
 * 
 * @param response - Data returned from the exchange's batch endpoints.
 * @param config - State and message mapping configuration.
 * @returns A promise resolving to an array of publication results.
 * @throws {ApiError} 454 if the corresponding local order record is missing.
 */
const publish = async (response: Array<TResponseData>, config: PublishConfig): Promise<Array<IPublishResult<IRequest>>> => {
  if (!Array.isArray(response) || !response.length) {
    console.error(`-> [Error] ${config.context}: Invalid response format`, response);
    return [];
  }

  const orders = await Promise.all(
    response.map(async (request) => {
      const exists = await Order.Fetch({ request: hexify(request.clientOrderId! || parseInt(request.orderId!), 6) });

      if (!exists) {
        throw new ApiError(454, `Order not found for Request: ${request.clientOrderId || request.orderId}`);
      }

      const success = (request.code || "0") === "0";
      const [current] = exists;

      return {
        success,
        current,
        request: {
          request: current.request,
          status: success ? config.states.success : config.states.fail,
          memo: success ? config.messages.success : `${config.messages.fail} [${request.code}]: ${request.msg}`,
          update_time: new Date(),
          code: parseInt(request.code) || 0,
          message: request.msg,
        } as TRequestResponse,
      };
    }),
  );

  return Promise.all(
    orders.map(async ({ success, current, request }) => {
      const { code, message, ...updates } = request;
      const result = await Request.Publish("API", current, updates);

      return {
        key: PrimaryKey(request, ["request"]),
        response: {
          ...result.response,
          context: config.context,
          outcome: success ? config.outcomes.success : config.outcomes.fail,
          message: String(success ? request.memo : result.response.success ? message : request.memo || ""),
          code: success ? 0 : result.response.success ? code || 0 : request.code || 0,
        },
      };
    }),
  );
};

// --- Public Functions ---

/**
 * Submits a batch cancellation request to the exchange.
 * 
 * Triggers the `/api/v1/trade/cancel-batch-orders` endpoint. 
 * Successful cancellations move local requests to the "Closed" state, 
 * while failures are marked as "Canceled" to denote the attempt failed.
 * 
 * @param requests - Collection of order identifiers to be canceled.
 * @returns Results of the API call and subsequent DB state updates.
 */
export const Cancel = async (requests: Array<Partial<IRequestAPI>>) => {
  if (!requests.length) return [];

  const cancels = requests.map(({ instId, orderId }) => ({ instId, orderId }));
  const { data } = await API_POST<Array<TResponseData>>("/api/v1/trade/cancel-batch-orders", cancels, "Request.Cancel");

  return await publish(data || [], {
    context: "Request.Publish.Cancel",
    states: { success: "Closed", fail: "Canceled" },
    outcomes: { success: "closed", fail: "error" },
    messages: {
      success: "[Info] Order canceled successfully",
      fail: "[Error] Order cancellation failed",
    },
  });
};

/**
 * Submits new batch order requests to the exchange.
 * 
 * Triggers the `/api/v1/trade/batch-orders` endpoint.
 * Successful submissions move requests to "Pending", while API rejections
 * move them to the "Rejected" state.
 * 
 * @param requests - Collection of new order parameters.
 * @returns Results of the order placement and DB synchronization.
 * @throws {ApiError} If the API returns a top-level error during transport.
 */
export const Submit = async (requests: Array<Partial<IRequestAPI>>) => {
  if (!requests.length) return [];

  try {
    const { data } = await API_POST<Array<TResponseData>>("/api/v1/trade/batch-orders", requests, "Requests.Submit");
    console.log("Success Result:", requests, data);
    return await publish(data || [], {
      context: "Request.Publish.Submit",
      states: { success: "Pending", fail: "Rejected" },
      outcomes: { success: "pending", fail: "rejected" },
      messages: {
        success: "[Info] Order submitted successfully",
        fail: "[Error] Order submission failed",
      },
    });
  } catch (error) {
    if (isApiError<TResponseData>(error)) {
      console.log("Fail Result:", requests, error?.code, error.message, error.data);
    }
    throw error;
  }
};
