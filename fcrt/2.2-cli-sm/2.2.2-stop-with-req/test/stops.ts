import type { IStopRequest } from "#db/interfaces/stop_request";
import { hexify } from "#lib/crypto.util";

//-- Test 2b: submit stop loss request with order --//
export const req_fcrt_2b: Array<Partial<IStopRequest>> = [
  {
    symbol: "XRP-USDT",
    position: "short",
    action: "buy",
    stop_request_type: "sl",
    size: 100,
    trigger_price: 2.85,
    order_price: 2.875,
    reduce_only: false,
    broker_id: undefined,
    memo: "Test 2b: submit stop loss request with order",
  },
  {
    symbol: "XRP-USDT",
    position: "short",
    action: "buy",
    stop_request_type: "tp",
    size: 100,
    trigger_price: 1.95,
    order_price: 1.975,
    reduce_only: false,
    broker_id: undefined,
    memo: "Test 2b: submit take profit request with order",
  },
];

//-- Test 3b: submit updates to queued stop requests--//
export const req_fcrt_3b: Array<Partial<IStopRequest>> = [
  {
    stop_request: hexify("DF8AE8D2CB"),
    size: 100,
    trigger_price: 3.05,
    order_price: 3.15,
    memo: "Test 3b: submit update to stop loss request",
  },
  {
    stop_request: hexify("E4BA01AD14"),
    size: 100,
    trigger_price: 1.95,
    order_price: 1.975,
    reduce_only: false,
    memo: "Test 3b: submit update to take profit request",
  },
];
