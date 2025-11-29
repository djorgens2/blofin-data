//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IResponse } from "api/response";
import type { IRequestAPI } from "api/requests";
import type { IStopsAPI } from "api/stops";
import type { IRequestState } from "db/interfaces/state";
import type { IRequest } from "db/interfaces/request";
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { format, hexString } from "lib/std.util";
import { hexify } from "lib/crypto.util";
import { Session } from "module/session";
import { Select, Update } from "db/query.utils";

import * as PositionsAPI from "api/positions";
import * as RequestAPI from "api/requests";
import * as OrderAPI from "api/orders";
import * as StopsAPI from "api/stops";

import * as Request from "db/interfaces/request";
import * as Orders from "db/interfaces/order";
import * as Stops from "db/interfaces/stops";
import * as States from "db/interfaces/state";
import * as InstrumentPosition from "db/interfaces/instrument_position";

//------------------ Private functions ---------------------//

//+----------------------------------------------------------------------------------------+
//| Handle order submits, rejects, and updates (from hold status);                         |
//+----------------------------------------------------------------------------------------+
const processOrders = async () => {
  //-- [Process.Orders] Expires requests beyond expiry
  const Expired = async (expired: Array<Partial<IRequest>>) => {
    if (expired.length) {
      const accepted = [];
      const rejected = [];

      for (const request of expired) {
        const result = await Request.Submit({
          ...request,
          status: "Expired",
          update_time: new Date(),
          memo: request.memo || `[Expired]: Request expired beyond set expiry time`,
        });
        result ? accepted.push(result) : rejected.push(result);
      }

      console.log("-> Pending expired requests:", expired.length);
      accepted.length && console.log("   # [Info] Expired requests accepted:", accepted.length);
      rejected.length && console.log("   # [Error] Expired requests rejected:", rejected.length);
    }
  };

  //-- [Process.Orders] Resubmits rejected requests to broker for execution; closes rejects beyond expiry
  const Rejected = async () => {
    const rejects = await Orders.Fetch({ status: "Rejected", account: Session().account });

    if (rejects) {
      const requeued: Array<Partial<IRequest>> = [];
      const expired: Array<Partial<IRequest>> = [];
      const expiry_time = new Date();

      for (const reject of rejects)
        expiry_time < reject.expiry_time!
          ? requeued.push({ ...reject, memo: `[Retry]: Rejected request state changed to Queued and resubmitted` })
          : expired.push({ request: reject.request, memo: `[Expired]: Queued and Rejected request changed to Expired` });

      if (requeued.length) {
        const queued = await States.Key<IRequestState>({ status: "Queued" });
        const accepted = [];
        const rejected = [];

        for (const request of requeued) {
          const result = await Request.Submit({ ...request, state: queued, update_time: expiry_time });
          result ? accepted.push(request) : rejected.push(request);
        }

        console.log(">> [Info] Trades.Rejected: Request retries:", requeued.length);
        accepted.length && console.log("   # [Info] Rejected requests requeued:", accepted.length);
        rejected.length && console.log("   # [Error] Resubmitted requests rejected:", rejected.length);
      }

      expired.length && Expired(expired);
    }
  };

  //-- [Process.Orders] Closes pending orders beyond expiry
  const Pending = async () => {
    const verify: Array<Partial<IRequest>> = [];
    const expired: Array<Partial<IRequest>> = [];

    const requests = await Orders.Fetch({ status: "Pending", account: Session().account });
    const expiry = new Date();

    if (requests) for (const pending of requests) expiry < pending.expiry_time! ? verify.push(pending) : expired.push({ request: pending.request });

    if (verify.length) {
      const promises = expired.map((request) => Request.Submit(request));
      await Promise.all(promises);
      console.log(">> [Info] Trades.Pending: Requests pending:", verify.length);
    }

    if (expired.length) {
      const promises = expired.map(({ request }) => Request.Cancel({ request, memo: `[Expired]: Pending order state changed to Canceled` }));
      await Promise.all(promises);
      console.log(">> [Warning] Trades.Pending: Requests canceled:", expired.length);
    }
  };

  //-- [Process.Orders] Submit local requests to the API
  const Queued = async () => {
    type Accumulator = { queued: Partial<IRequestAPI>[]; expired: Partial<IRequestAPI>[] };

    const requests = await Select<IRequestAPI>({ status: "Queued", account: Session().account }, { table: `vw_api_requests` });

    if (requests.length) {
      const expiry = new Date();
      const { queued, expired } = requests.reduce(
        (acc: Accumulator, request) => {
          expiry < request.expiry_time! ? acc.queued.push(request) : acc.expired.push({ ...request, memo: `[Expired]: Queued request changed to Expired` });
          return acc;
        },
        { queued: [], expired: [] }
      );

      const promises = queued.map(async (r) => InstrumentPosition.Leverage({ symbol: r.instId, position: r.positionSide, leverage: parseInt(r.leverage!) }));
      const results = await Promise.all(promises);
      const success = results.filter((result) => result !== null && result !== undefined);
      const [accepted, rejected] = queued.length ? (await RequestAPI.Submit(queued)) ?? [[], []] : [[], []];

      console.log(">> Trades.Queued: Requests in queue:", requests.length);
      requests.length && console.log("-> Queued requests submitted:", queued.length);
      accepted.length && console.log("   # [Info] Requests accepted:", accepted.length);
      success.length && console.log("   # [Info] Leverages modified:", success.length);
      rejected.length && console.log("   # [Error] Requests rejected:", rejected.length);

      expired.length && (await Expired(expired.map((r) => ({ request: hexify(r.clientOrderId!, 6), memo: r.memo }))));
    }
  };

  //-- [Process.Orders] Submit Cancel requests to the API for orders in canceled state
  const Canceled = async () => {
    const orders = await Orders.Fetch({ status: "Canceled", account: Session().account });

    if (orders) {
      const cancels = [];
      const closed = [];

      for (const order of orders) {
        const orderId = BigInt(hexString(order.order_id!, 10)).toString();
        order.order_id && order.request_status === "Pending" ? cancels.push({ instId: order.symbol, orderId }) : closed.push(order);
      }

      const [accepted, rejected] = (await OrderAPI.Cancel(cancels)) ?? [[], []];

      if (cancels.length) {
        console.log(">> Trades.Canceled: Cancel requests submitted:", cancels.length);
        accepted.length && console.log("   # [Info] Canceled requests accepted:", accepted.length);
        rejected.length && console.log("   # [Error] Canceled requests rejected:", rejected.length);
        closed.length && console.log("   # [Warning] Canceled requests previously closed (???):", closed.length);
      }
    }
  };

  //-- [Process.Orders] Resubmit requests canceled by modification to the API for orders in hold state
  const Hold = async () => {
    const orders = await Orders.Fetch({ status: "Hold", account: Session().account });
    const accepted = [];
    const rejected = [];

    if (orders) {
      const queued = await States.Key<IRequestState>({ status: "Queued" });
      const cancels = orders.map(({ symbol, order_id }) => ({ instId: symbol, orderId: BigInt(hexString(order_id!, 10)).toString() }));
      const [processed, errors] = (await OrderAPI.Cancel(cancels)) ?? [[], []];

      for (const hold of processed) {
        const result = await Request.Submit({
          request: hold.request!,
          state: queued,
          memo: `[Info] Trades.Hold: Hold request successfully resubmitted`,
          update_time: new Date(),
        });
        result ? accepted.push(result) : rejected.push(result);
      }

      console.log(">> Trades.Hold: Hold orders processed:", orders.length);
      processed.length && console.log("-> Hold orders submitted:", processed.length);
      accepted.length && console.log("   # [Info]: Hold orders accepted:", accepted.length);
      errors.length && console.log("-> Hold order errors:", errors.length);
      rejected.length && console.log("   # [Error] Hold orders rejected:", rejected.length);
    }
  };

  await Rejected();
  await Pending();
  await Canceled();
  await Hold();
  await Queued();
};

//+--------------------------------------------------------------------------------------+
//| Handle stop order submits, rejects, and updates (from hold status);                  |
//+--------------------------------------------------------------------------------------+
const processStops = async () => {
  //-- Checks if position is still open
  const isOpen = async (props: Partial<IInstrumentPosition>) => {
    const result = await InstrumentPosition.Fetch({ ...props, account: Session().account, status: "Open" });
    return !!result;
  };

  //-- [Process.Stops] Resubmits rejected requests to broker for execution; closes rejects beyond expiry
  const Rejected = async () => {
    const rejects = await Stops.Fetch({ status: "Rejected", account: Session().account });

    if (rejects) {
      const accepted = [];
      const rejected = [];
      const closures = [];

      for (const reject of rejects) {
        const positionOpen = await isOpen({ instrument_position: reject.instrument_position });
        const status = positionOpen ? "Queued" : "Closed";
        const result = await Stops.Submit({
          ...reject,
          status,
          memo: positionOpen
            ? `[Retry]: Rejected request state changed to Queued and resubmitted`
            : `[Retry]: Rejected request on closed position; state changed to Closed`,
          update_time: new Date(),
        });

        if (result) {
          status === "Queued" ? accepted.push(reject.stop_request) : closures.push(reject.stop_request);
        } else rejected.push(reject.stop_request);
      }

      console.log(">> [Info] Trades.Rejected: Request retries:", rejects.length);
      accepted.length && console.log("   # [Info] Rejected requests requeued:", accepted.length);
      closures.length && console.log("   # [Warning] Rejected requests closed:", closures.length);
      rejected.length && console.log("   # [Error] Resubmitted requests rejected:", rejected.length);
    }
  };

  //-- [Process.Stops] Closes pending orders beyond expiry
  const Pending = async () => {
    const pending: Array<Partial<IRequest>> = [];
    const expired: Array<Partial<IRequest>> = [];

    const requests = await Stops.Fetch({ status: "Pending", account: Session().account });

    requests && console.log(`In Stops.Pending[${requests.length}]`);

    if (requests) {
      for (const request of requests) {
        const positionOpen = await isOpen({ instrument_position: request.instrument_position });
        const status = positionOpen ? "Pending" : "Expired";
        const result = await Stops.Submit({
          ...request,
          status,
          memo: positionOpen ? request.memo : `[Expired]: Pending order state changed to Expired`,
          update_time: new Date(),
        });
        status === "Pending" ? pending.push(request) : expired.push(request);
      }

      console.log(">> [Info] Trades.Rejected: Request retries:", requests.length);
      pending.length && console.log(">> [Info] Trades.Pending: Requests pending:", pending.length);
      expired.length && console.log(">> [Warning] Trades.Pending: Requests canceled:", expired.length, expired);
    }
  };

  //-- [Process.Stops] Submit local requests to the API
  const Queued = async () => {
    const queued: Array<Partial<IStopsAPI>> = [];
    const errors: Array<Partial<IStopsAPI>> = [];
    const verify: Array<Partial<IStopsAPI>> = [];
    const processed: Array<Stops.IStopRequest["stop_request"]> = [];
    const success: Array<Partial<IResponse>> = [];
    const failed: Array<Partial<IResponse>> = [];
    const expired: Array<Partial<IStopsAPI>> = [];
    const closures: Array<Partial<IStopsAPI>> = [];

    const requests = await Select<IStopsAPI>({ status: "Queued", account: Session().account }, { table: `vw_api_stop_requests` });

    if (requests.length) {
      for (const request of requests) {
        const positionOpen = await isOpen({ symbol: request.instId, position: request.positionSide });
        const { account, tpslId, status, memo, update_time, ...api } = request;
        tpslId ? errors.push(api) : positionOpen ? queued.push(api) : verify.push(api);
      }

      if (verify.length) {
        for (const verified of verify) {
          const instrument_position = await InstrumentPosition.Fetch({ symbol: verified.instId, position: verified.positionSide, account: Session().account });

          if (instrument_position) {
            const [current] = instrument_position;
            const { open_request } = current;

            if (open_request) {
              const result = await Stops.Submit({
                stop_request: hexify(verified.clientOrderId!, 5),
                instrument_position: current.instrument_position,
                trigger_price: verified.tpTriggerPrice == null ? format(verified.slTriggerPrice!) : format(verified.tpTriggerPrice),
                order_price: verified.tpOrderPrice == null ? format(verified.slOrderPrice!) : format(verified.tpOrderPrice),
                size: format(verified.size!),
                reduce_only: verified.reduceOnly === "true",
                broker_id: verified.brokerId == null ? undefined : verified.brokerId,
                update_time: new Date(),
              });
              result ? processed.push(result) : errors.push(verified);
            } else expired.push(verified);
          } else errors.push(verified);
        }
      }

      if (expired.length) {
        const state = await States.Key<IRequestState>({ status: "Expired" });

        for (const expire of expired) {
          const stop_request = {
            stop_request: hexify(expire.clientOrderId!, 5),
            state,
            memo: `[Info] Trades.Queued: Stop order on closed position; state changed to Expired`,
            update_time: new Date(),
          };
          const [result, updates] = await Update(stop_request, { table: `stop_request`, keys: [{ key: `stop_request` }] });
          result && closures.push(expire);
        }
      }

      if (queued.length) {
        for (const queue of queued) {
          const [accepted, rejected] = (await StopsAPI.Submit(queue)) ?? [[], []];
          success.push(...accepted);
          failed.push(...rejected);
        }
      }

      console.log("-> Trades.Queued: Stop Requests in queue:", requests.length);
      if (queued.length) {
        success.length && console.log("   # [Info] Stop Requests submitted:", success.length);
        failed.length && console.log("   # [Error] Stop Requests rejected:", failed.length);
      }
      if (verify.length) {
        processed.length && console.log("   # [Info] Stop Requests waiting:", processed.length);
        closures.length && console.log("   # [Warning] Stop Requests expired:", closures.length);
      }
    }
  };

  //-- [Process.Stops] Submit Cancel requests to the API for orders in canceled state
  const Canceled = async () => {
    const api = await Select<IStopsAPI>({ status: "Canceled", account: Session().account }, { table: `vw_api_stop_requests` });

    if (api.length) {
      const cancels = [];
      const closures: Array<Partial<IStopsAPI>> = [];
      const errors = [];

      for (const order of api) {
        const { tpslId, instId, positionSide, clientOrderId } = order;
        order.tpslId ? cancels.push({ tpslId, instId, clientOrderId }) : clientOrderId ? closures.push({ clientOrderId }) : errors.push(order);
      }

      if (closures.length) {
        for (const close of closures) {
          const closed = await States.Key<IRequestState>({ status: "Closed" });
          const stop_request = {
            tpsl_id: hexify(close.clientOrderId!.slice(2), 4),
            state: closed,
            memo: `[Info] Trades.Canceled: Stop order on closed position; state changed to Closed`,
            update_time: new Date(),
          };
          const [result, updates] = await Update(stop_request, { table: `vw_stop_states`, keys: [{ key: `tpsl_id` }] });
        }

        if (cancels.length) {
          const [accepted, rejected] = (await OrderAPI.Cancel(cancels)) ?? [[], []];

          console.log(">> Trades.Canceled: Cancel requests submitted:", cancels.length);
          accepted.length && console.log("   # [Info] Canceled requests accepted:", accepted.length);
          rejected.length && console.log("   # [Error] Canceled requests rejected:", rejected.length);
          closures.length && console.log("   # [Warning] Canceled requests previously closed (???):", closures.length);
        }
      }
    }
  };

  //-- [Process.Stops] Resubmit requests canceled by modification to the API for orders in hold state
  const Hold = async () => {
    const holds = await Stops.Fetch({ status: "Hold", account: Session().account });
    const accepted = [];
    const rejected = [];

    if (holds) {
      const queued = await States.Key<IRequestState>({ status: "Queued" });
      const cancels: Array<Partial<IStopsAPI>> = holds.map(({ symbol, tpsl_id, client_order_id }) => ({
        instId: symbol,
        tpslId: BigInt(hexString(tpsl_id!, 8)).toString(10),
        clientOrderId: BigInt(hexString(client_order_id!, 10)).toString(10),
      }));
      const [processed, errors] = (await StopsAPI.Cancel(cancels)) ?? [[], []];

      for (const hold of processed) {
        const result = await Request.Submit({
          request: hold.request!,
          state: queued,
          memo: `[Info] Trades.Hold: Modified stop request successfully resubmitted`,
          update_time: new Date(),
        });
        result ? accepted.push(result) : rejected.push(result);
      }

      console.log(">> Trades.Hold: Hold orders processed:", holds.length);
      processed.length && console.log("-> Hold orders submitted:", processed.length);
      accepted.length && console.log("   # [Info]: Hold orders accepted:", accepted.length);
      errors.length && console.log("-> Hold order errors:", errors.length);
      rejected.length && console.log("   # [Error] Hold orders rejected:", rejected.length);
    }
  };

  await Rejected();
  await Canceled();
  await Pending();
  await Hold();
  await Queued();
};

//------------------ Public functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  console.log("In Execute.Trades:", new Date().toLocaleString());

  await PositionsAPI.Import();
  await OrderAPI.Import();
  await StopsAPI.Import();

  await processOrders();
  await processStops();
};
