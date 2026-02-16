import type { IRequest } from "db/interfaces/request";
import type { IStopRequest } from "db/interfaces/stop_request";

//-- Test 2a: submit stop loss request without order --//
export const req_fcrt_2a: Partial<IStopRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "buy",
  stop_request_type: "sl",
  size: 100,
  trigger_price: 2.85,
  order_price: 2.875,
  memo: "Test 2a: submit stop loss request without order",
};

//-- Test 2b: request w/o expiry; w/o tpsl
export const req_fcrt_2b: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 1.425,
  size: 100,
};

//-- Test 2c: submit stop loss request without order --//
export const req_fcrt_2c: Partial<IStopRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "buy",
  stop_request_type: "sl",
  size: 100,
  trigger_price: 2.85,
  order_price: 2.875,
  memo: "Test 2c: submit stop loss request without order",
};

//-- Test 3a: request w/o expiry; w/o tpsl
export const req_fcrt_3a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 1.44,
  size: 100,
};

//-- Test 3b: submit combined sl/tp request without order --//
export const req_fcrt_3b: Partial<IStopRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "buy",
  stop_request_type: "tp",
  size: 100,
  trigger_price: 1.25,
  order_price: 1.275,
  memo: "Test 3b: submit take profit request",
};

//-- Test 3c: submit combined sl/tp request order --//
export const req_fcrt_3c: Array<Partial<IStopRequest>> = [
  {
    symbol: "XRP-USDT",
    position: "short",
    action: "buy",
    stop_request_type: "sl",
    size: 100,
    trigger_price: 2.85,
    order_price: 2.875,
  },
  {
    symbol: "XRP-USDT",
    position: "short",
    action: "buy",
    stop_request_type: "tp",
    size: 100,
    trigger_price: 1.95,
    order_price: 1.9,
  },
];
